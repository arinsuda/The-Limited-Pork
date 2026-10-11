package application_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application"
	"github.com/mookrob/backend/internal/domain/identity"
	"github.com/mookrob/backend/internal/infrastructure/auth"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/infrastructure/system"
	"github.com/mookrob/backend/pkg/pagination"
)

func TestUserService_CreateAndResetPassword(t *testing.T) {
	clock := system.NewRealClock()
	idGen := system.NewUUIDGen()
	hasher := auth.NewBcryptHasher()

	userRepo := newMockUserRepo()
	roleRepo := newMockRoleRepo()

	userSvc := application.NewUserService(userRepo, roleRepo, hasher, clock, idGen)
	ctx := context.Background()

	// 1. Admin creates a new user (Cook)
	roles, _ := roleRepo.List()
	var cookRole *identity.Role
	for _, r := range roles {
		if r.Code == "COOK" {
			cookRole = &r
			break
		}
	}
	if cookRole == nil {
		t.Fatalf("cook role not found")
	}

	createdUser, err := userSvc.Create(ctx, application.CreateUserInput{
		Email:       "newcook@mookrob.com",
		DisplayName: "New Line Cook",
		Password:    "InitialPass123!",
		Locale:      "th",
		RoleIDs:     []uuid.UUID{cookRole.ID},
		IsActive:    true,
	})
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}
	if createdUser.Email != "newcook@mookrob.com" {
		t.Errorf("expected email to match, got %s", createdUser.Email)
	}

	// 2. Reject duplicate email
	_, err = userSvc.Create(ctx, application.CreateUserInput{
		Email:       "newcook@mookrob.com",
		DisplayName: "Another Cook",
		Password:    "InitialPass123!",
	})
	if err == nil {
		t.Errorf("expected error for duplicate email, got nil")
	}

	// 3. Reject short password (< 8 chars)
	_, err = userSvc.Create(ctx, application.CreateUserInput{
		Email:       "shortpass@mookrob.com",
		DisplayName: "Short Cook",
		Password:    "short",
	})
	if err == nil {
		t.Errorf("expected error for short password, got nil")
	}

	// 4. Admin force resets user's password
	newPassword := "ForceResetPass456!"
	err = userSvc.ResetPassword(ctx, createdUser.ID, newPassword)
	if err != nil {
		t.Fatalf("failed to reset password: %v", err)
	}

	// Verify the new password matches via hasher
	updatedUser, _ := userRepo.GetByID(createdUser.ID)
	if !hasher.ComparePassword(newPassword, updatedUser.PasswordHash) {
		t.Errorf("expected new password to match hash")
	}

	// 5. User changes their own password via AuthService
	cfg := &config.Config{
		JWTSecret:           "test-secret-at-least-32-characters-long-key",
		JWTIssuer:           "mookrob-test",
		JWTAudience:         "mookrob-test",
		AccessTokenTTLMin:   15 * time.Minute,
		RefreshTokenTTLDays: 7 * 24 * time.Hour,
	}
	jwtSvc := auth.NewJWTService(cfg, clock, idGen)
	refreshRepo := newMockRefreshRepo()
	authSvc := application.NewAuthService(userRepo, roleRepo, refreshRepo, hasher, jwtSvc, clock, idGen, cfg)

	ownNewPassword := "MyOwnSecretPass789!"
	err = authSvc.ChangePassword(ctx, createdUser.ID, newPassword, ownNewPassword)
	if err != nil {
		t.Fatalf("failed to change own password: %v", err)
	}

	// Verify user can login with the newly self-changed password
	loginRes, err := authSvc.Login(ctx, "newcook@mookrob.com", ownNewPassword)
	if err != nil {
		t.Fatalf("failed to login with newly changed password: %v", err)
	}
	if loginRes.User.ID != createdUser.ID {
		t.Errorf("expected user id to match")
	}

	// 6. List users
	paged, err := userSvc.List(ctx, pagination.Params{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("failed to list users: %v", err)
	}
	if len(paged.Data) < 1 {
		t.Errorf("expected at least 1 user in list")
	}
}
