package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/pkg/apperror"
)

type JWTService struct {
	cfg   *config.Config
	clock ports.Clock
	idGen ports.IDGen
}

func NewJWTService(cfg *config.Config, clock ports.Clock, idGen ports.IDGen) *JWTService {
	return &JWTService{
		cfg:   cfg,
		clock: clock,
		idGen: idGen,
	}
}

type CustomClaims struct {
	ports.Claims
	jwt.RegisteredClaims
}

func (s *JWTService) GenerateAccessToken(c ports.Claims) (string, time.Duration, error) {
	now := s.clock.Now()
	ttl := s.cfg.AccessTokenTTLMin
	expiresAt := now.Add(ttl)

	claims := CustomClaims{
		Claims: c,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   c.UserID.String(),
			Issuer:    s.cfg.JWTIssuer,
			Audience:  jwt.ClaimStrings{s.cfg.JWTAudience},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", 0, fmt.Errorf("failed to sign access token: %w", err)
	}

	return tokenString, ttl, nil
}

func (s *JWTService) GenerateRefreshToken() (string, string, uuid.UUID, time.Time, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", uuid.Nil, time.Time{}, err
	}
	rawToken := hex.EncodeToString(bytes)
	tokenHash := HashSHA256(rawToken)
	familyID := s.idGen.NewUUID()
	expiresAt := s.clock.Now().Add(s.cfg.RefreshTokenTTLDays)

	return rawToken, tokenHash, familyID, expiresAt, nil
}

func (s *JWTService) HashToken(token string) string {
	return HashSHA256(token)
}

func (s *JWTService) ParseAccessToken(tokenString string) (*ports.Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(s.cfg.JWTSecret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, apperror.TokenExpired("access token has expired")
		}
		return nil, apperror.Unauthenticated("invalid access token")
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, apperror.Unauthenticated("invalid token claims")
	}

	if claims.Claims.UserID == uuid.Nil && claims.Subject != "" {
		if uid, err := uuid.Parse(claims.Subject); err == nil {
			claims.Claims.UserID = uid
		}
	}

	return &claims.Claims, nil
}
