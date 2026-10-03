package application

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/domain/identity"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/pkg/apperror"
)

type AuthService struct {
	userRepo    identity.UserRepository
	tokenRepo   identity.RefreshTokenRepository
	hasher      ports.PasswordHasher
	tokenIssuer ports.TokenIssuer
	clock       ports.Clock
	idGen       ports.IDGen
	cfg         *config.Config
}

func NewAuthService(
	userRepo identity.UserRepository,
	tokenRepo identity.RefreshTokenRepository,
	hasher ports.PasswordHasher,
	tokenIssuer ports.TokenIssuer,
	clock ports.Clock,
	idGen ports.IDGen,
	cfg *config.Config,
) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		tokenRepo:   tokenRepo,
		hasher:      hasher,
		tokenIssuer: tokenIssuer,
		clock:       clock,
		idGen:       idGen,
		cfg:         cfg,
	}
}

type AuthResult struct {
	AccessToken  string        `json:"accessToken"`
	TokenType    string        `json:"tokenType"`
	ExpiresIn    int           `json:"expiresIn"`
	User         UserDTO       `json:"user"`
	RefreshToken string        `json:"-"`
}

type UserDTO struct {
	ID          uuid.UUID `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	Locale      string    `json:"locale"`
	Roles       []string  `json:"roles"`
	Permissions []string  `json:"permissions"`
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*AuthResult, error) {
	u, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return nil, apperror.InvalidCredentials("invalid email or password")
	}

	if !u.IsActive {
		return nil, apperror.Forbidden("user account is inactive")
	}

	if !s.hasher.ComparePassword(password, u.PasswordHash) {
		return nil, apperror.InvalidCredentials("invalid email or password")
	}

	return s.createSession(ctx, u)
}

func (s *AuthService) Refresh(ctx context.Context, rawRefreshToken string) (*AuthResult, error) {
	if rawRefreshToken == "" {
		return nil, apperror.Unauthenticated("missing refresh token")
	}

	tokenHash := s.tokenIssuer.HashToken(rawRefreshToken)
	rt, err := s.tokenRepo.GetByHash(tokenHash)
	if err != nil {
		return nil, apperror.Unauthenticated("invalid refresh token")
	}

	// Reuse detection: if token is revoked, revoke all tokens in family
	if rt.IsRevoked {
		_ = s.tokenRepo.RevokeFamily(rt.FamilyID)
		return nil, apperror.Unauthenticated("revoked refresh token reused; session invalidated")
	}

	if rt.ExpiresAt.Before(s.clock.Now()) {
		_ = s.tokenRepo.Revoke(rt.ID)
		return nil, apperror.TokenExpired("refresh token expired")
	}

	// Revoke current token
	_ = s.tokenRepo.Revoke(rt.ID)

	u, err := s.userRepo.GetByID(rt.UserID)
	if err != nil || !u.IsActive {
		return nil, apperror.Unauthenticated("user account is no longer active")
	}

	// Issue new token in same family
	newRawToken, newHash, _, expiresAt, err := s.tokenIssuer.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	newRT := &identity.RefreshToken{
		ID:        s.idGen.NewUUID(),
		UserID:    u.ID,
		TokenHash: newHash,
		FamilyID:  rt.FamilyID,
		IsRevoked: false,
		ExpiresAt: expiresAt,
		CreatedAt: s.clock.Now(),
	}
	if err := s.tokenRepo.Create(newRT); err != nil {
		return nil, err
	}

	perms, _ := s.userRepo.GetPermissions(u.ID)
	roleCodes := make([]string, len(u.Roles))
	for i, r := range u.Roles {
		roleCodes[i] = r.Code
	}

	accessToken, ttl, err := s.tokenIssuer.GenerateAccessToken(ports.Claims{
		UserID:      u.ID,
		Email:       u.Email,
		DisplayName: u.DisplayName,
		Roles:       roleCodes,
		Permissions: perms,
		Locale:      u.Locale,
	})
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(ttl.Seconds()),
		User: UserDTO{
			ID:          u.ID,
			Email:       u.Email,
			DisplayName: u.DisplayName,
			Locale:      u.Locale,
			Roles:       roleCodes,
			Permissions: perms,
		},
		RefreshToken: newRawToken,
	}, nil
}

func (s *AuthService) Logout(ctx context.Context, rawRefreshToken string) error {
	if rawRefreshToken != "" {
		tokenHash := s.tokenIssuer.HashToken(rawRefreshToken)
		rt, err := s.tokenRepo.GetByHash(tokenHash)
		if err == nil {
			_ = s.tokenRepo.Revoke(rt.ID)
		}
	}
	return nil
}

func (s *AuthService) GetMe(ctx context.Context, userID uuid.UUID) (*UserDTO, error) {
	u, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}

	perms, _ := s.userRepo.GetPermissions(u.ID)
	roleCodes := make([]string, len(u.Roles))
	for i, r := range u.Roles {
		roleCodes[i] = r.Code
	}

	return &UserDTO{
		ID:          u.ID,
		Email:       u.Email,
		DisplayName: u.DisplayName,
		Locale:      u.Locale,
		Roles:       roleCodes,
		Permissions: perms,
	}, nil
}

func (s *AuthService) UpdateMe(ctx context.Context, userID uuid.UUID, displayName, locale string) (*UserDTO, error) {
	u, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}

	u.DisplayName = displayName
	if locale != "" {
		u.Locale = locale
	}

	if err := s.userRepo.Update(u); err != nil {
		return nil, err
	}

	return s.GetMe(ctx, userID)
}

func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
	u, err := s.userRepo.GetByID(userID)
	if err != nil {
		return err
	}

	if !s.hasher.ComparePassword(currentPassword, u.PasswordHash) {
		return apperror.BadRequest("current password is incorrect")
	}

	if len(newPassword) < 6 {
		return apperror.Validation("password too short", apperror.Detail{Field: "newPassword", Code: "min_length", Param: "6"})
	}

	newHash, err := s.hasher.HashPassword(newPassword)
	if err != nil {
		return err
	}

	return s.userRepo.UpdatePassword(userID, newHash)
}

func (s *AuthService) createSession(ctx context.Context, u *identity.User) (*AuthResult, error) {
	perms, _ := s.userRepo.GetPermissions(u.ID)
	roleCodes := make([]string, len(u.Roles))
	for i, r := range u.Roles {
		roleCodes[i] = r.Code
	}

	accessToken, ttl, err := s.tokenIssuer.GenerateAccessToken(ports.Claims{
		UserID:      u.ID,
		Email:       u.Email,
		DisplayName: u.DisplayName,
		Roles:       roleCodes,
		Permissions: perms,
		Locale:      u.Locale,
	})
	if err != nil {
		return nil, err
	}

	rawToken, tokenHash, familyID, expiresAt, err := s.tokenIssuer.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	rt := &identity.RefreshToken{
		ID:        s.idGen.NewUUID(),
		UserID:    u.ID,
		TokenHash: tokenHash,
		FamilyID:  familyID,
		IsRevoked: false,
		ExpiresAt: expiresAt,
		CreatedAt: s.clock.Now(),
	}
	if err := s.tokenRepo.Create(rt); err != nil {
		return nil, fmt.Errorf("failed to save refresh token: %w", err)
	}

	return &AuthResult{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(ttl.Seconds()),
		User: UserDTO{
			ID:          u.ID,
			Email:       u.Email,
			DisplayName: u.DisplayName,
			Locale:      u.Locale,
			Roles:       roleCodes,
			Permissions: perms,
		},
		RefreshToken: rawToken,
	}, nil
}
