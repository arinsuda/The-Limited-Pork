package auth_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/infrastructure/auth"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/infrastructure/system"
)

func TestBcryptHasher(t *testing.T) {
	hasher := auth.NewBcryptHasher()
	password := "SecretP@ss123"

	hash, err := hasher.HashPassword(password)
	if err != nil {
		t.Fatalf("unexpected hash error: %v", err)
	}

	if !hasher.ComparePassword(password, hash) {
		t.Errorf("expected correct password to match hash")
	}

	if hasher.ComparePassword("WrongPassword", hash) {
		t.Errorf("expected wrong password to NOT match hash")
	}
}

func TestJWTService(t *testing.T) {
	cfg := &config.Config{
		JWTSecret:           "test-secret-at-least-32-characters-long-key",
		JWTIssuer:           "mookrob-test",
		JWTAudience:         "mookrob-test",
		AccessTokenTTLMin:   15 * time.Minute,
		RefreshTokenTTLDays: 7 * 24 * time.Hour,
	}
	clock := system.NewRealClock()
	idGen := system.NewUUIDGen()

	jwtSvc := auth.NewJWTService(cfg, clock, idGen)

	userID := uuid.New()
	claims := ports.Claims{
		UserID:      userID,
		Email:       "test@mookrob.local",
		DisplayName: "Test Cook",
		Roles:       []string{"COOK"},
		Permissions: []string{"recipes.read", "trials.read"},
		Locale:      "th",
	}

	token, ttl, err := jwtSvc.GenerateAccessToken(claims)
	if err != nil {
		t.Fatalf("failed to generate access token: %v", err)
	}
	if token == "" || ttl <= 0 {
		t.Fatalf("invalid generated token")
	}

	parsed, err := jwtSvc.ParseAccessToken(token)
	if err != nil {
		t.Fatalf("failed to parse access token: %v", err)
	}

	if parsed.UserID != userID {
		t.Errorf("expected userID %s, got %s", userID, parsed.UserID)
	}
	if parsed.Email != claims.Email {
		t.Errorf("expected email %s, got %s", claims.Email, parsed.Email)
	}
	if len(parsed.Permissions) != 2 {
		t.Errorf("expected 2 permissions, got %d", len(parsed.Permissions))
	}

	// Refresh token generation and hashing
	rawRT, hashRT, familyID, expiresAt, err := jwtSvc.GenerateRefreshToken()
	if err != nil {
		t.Fatalf("failed to generate refresh token: %v", err)
	}
	if rawRT == "" || hashRT == "" || familyID == uuid.Nil || expiresAt.IsZero() {
		t.Errorf("invalid refresh token properties")
	}

	if jwtSvc.HashToken(rawRT) != hashRT {
		t.Errorf("HashToken should produce consistent hash")
	}
}
