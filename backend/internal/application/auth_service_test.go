package application_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application"
	"github.com/mookrob/backend/internal/domain/identity"
	"github.com/mookrob/backend/internal/infrastructure/auth"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/infrastructure/system"
	"github.com/mookrob/backend/pkg/apperror"
)

type mockUserRepo struct {
	users   map[uuid.UUID]*identity.User
	byEmail map[string]*identity.User
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{
		users:   make(map[uuid.UUID]*identity.User),
		byEmail: make(map[string]*identity.User),
	}
}

func (m *mockUserRepo) Create(u *identity.User) error {
	if _, ok := m.byEmail[u.Email]; ok {
		return fmt.Errorf("duplicate email")
	}
	m.users[u.ID] = u
	m.byEmail[u.Email] = u
	return nil
}

func (m *mockUserRepo) GetByID(id uuid.UUID) (*identity.User, error) {
	u, ok := m.users[id]
	if !ok {
		return nil, apperror.NotFound("user", id.String())
	}
	return u, nil
}

func (m *mockUserRepo) GetByEmail(email string) (*identity.User, error) {
	u, ok := m.byEmail[email]
	if !ok {
		return nil, apperror.NotFound("user", email)
	}
	return u, nil
}

func (m *mockUserRepo) Update(u *identity.User) error {
	m.users[u.ID] = u
	m.byEmail[u.Email] = u
	return nil
}

func (m *mockUserRepo) UpdatePassword(id uuid.UUID, passwordHash string) error {
	u, ok := m.users[id]
	if !ok {
		return apperror.NotFound("user", id.String())
	}
	u.PasswordHash = passwordHash
	return nil
}

func (m *mockUserRepo) List(q string, limit, offset int) ([]identity.User, int, error) {
	res := make([]identity.User, 0, len(m.users))
	for _, u := range m.users {
		res = append(res, *u)
	}
	return res, len(res), nil
}

func (m *mockUserRepo) GetRoles(userID uuid.UUID) ([]identity.Role, error) {
	u, ok := m.users[userID]
	if !ok {
		return nil, apperror.NotFound("user", userID.String())
	}
	return u.Roles, nil
}

func (m *mockUserRepo) GetPermissions(userID uuid.UUID) ([]string, error) {
	u, ok := m.users[userID]
	if !ok {
		return nil, apperror.NotFound("user", userID.String())
	}
	var perms []string
	for _, r := range u.Roles {
		perms = append(perms, r.Permissions...)
	}
	return perms, nil
}

func (m *mockUserRepo) Count() (int, error) {
	return len(m.users), nil
}

type mockRoleRepo struct {
	roles map[string]identity.Role
}

func newMockRoleRepo() *mockRoleRepo {
	return &mockRoleRepo{
		roles: map[string]identity.Role{
			"OWNER": {
				ID:          uuid.New(),
				Code:        "OWNER",
				NameTh:      "เจ้าของร้าน",
				NameEn:      "Owner",
				Permissions: []string{"recipes.manage", "trials.manage"},
			},
			"COOK": {
				ID:          uuid.New(),
				Code:        "COOK",
				NameTh:      "พ่อครัว",
				NameEn:      "Cook",
				Permissions: []string{"recipes.read", "trials.create"},
			},
		},
	}
}

func (m *mockRoleRepo) List() ([]identity.Role, error) {
	res := make([]identity.Role, 0, len(m.roles))
	for _, r := range m.roles {
		res = append(res, r)
	}
	return res, nil
}

func (m *mockRoleRepo) GetByID(id uuid.UUID) (*identity.Role, error) {
	for _, r := range m.roles {
		if r.ID == id {
			return &r, nil
		}
	}
	return nil, apperror.NotFound("role", id.String())
}

func (m *mockRoleRepo) GetByCode(code string) (*identity.Role, error) {
	r, ok := m.roles[code]
	if !ok {
		return nil, apperror.NotFound("role", code)
	}
	return &r, nil
}

func (m *mockRoleRepo) UpdatePermissions(roleID uuid.UUID, permissionCodes []string) error {
	return nil
}

func (m *mockRoleRepo) ListPermissions() ([]identity.Permission, error) {
	return nil, nil
}

type mockRefreshRepo struct {
	tokens map[uuid.UUID]*identity.RefreshToken
}

func newMockRefreshRepo() *mockRefreshRepo {
	return &mockRefreshRepo{tokens: make(map[uuid.UUID]*identity.RefreshToken)}
}

func (m *mockRefreshRepo) Create(rt *identity.RefreshToken) error {
	m.tokens[rt.ID] = rt
	return nil
}

func (m *mockRefreshRepo) GetByHash(hash string) (*identity.RefreshToken, error) {
	for _, t := range m.tokens {
		if t.TokenHash == hash {
			return t, nil
		}
	}
	return nil, apperror.NotFound("refresh_token", hash)
}

func (m *mockRefreshRepo) Revoke(id uuid.UUID) error {
	if t, ok := m.tokens[id]; ok {
		t.IsRevoked = true
	}
	return nil
}

func (m *mockRefreshRepo) RevokeFamily(familyID uuid.UUID) error {
	for _, t := range m.tokens {
		if t.FamilyID == familyID {
			t.IsRevoked = true
		}
	}
	return nil
}

func TestAuthService_RegisterAndLogin(t *testing.T) {
	cfg := &config.Config{
		JWTSecret:           "test-secret-at-least-32-characters-long-key",
		JWTIssuer:           "mookrob-test",
		JWTAudience:         "mookrob-test",
		AccessTokenTTLMin:   15 * time.Minute,
		RefreshTokenTTLDays: 7 * 24 * time.Hour,
	}
	clock := system.NewRealClock()
	idGen := system.NewUUIDGen()
	hasher := auth.NewBcryptHasher()
	jwtSvc := auth.NewJWTService(cfg, clock, idGen)

	userRepo := newMockUserRepo()
	roleRepo := newMockRoleRepo()
	refreshRepo := newMockRefreshRepo()

	svc := application.NewAuthService(userRepo, roleRepo, refreshRepo, hasher, jwtSvc, clock, idGen, cfg)
	ctx := context.Background()

	// 1. First user registered should become OWNER
	res1, err := svc.Register(ctx, application.RegisterInput{
		Email:       "owner@mookrob.com",
		Password:    "SecurePass123!",
		DisplayName: "Head Chef Owner",
		Locale:      "th",
	})
	if err != nil {
		t.Fatalf("first registration failed: %v", err)
	}
	if res1.AccessToken == "" {
		t.Errorf("expected access token to be non-empty")
	}
	if len(res1.User.Roles) == 0 || res1.User.Roles[0] != "OWNER" {
		t.Errorf("expected first user to have OWNER role, got: %v", res1.User.Roles)
	}

	// 2. Second user registered should become COOK
	res2, err := svc.Register(ctx, application.RegisterInput{
		Email:       "cook@mookrob.com",
		Password:    "SecurePass123!",
		DisplayName: "Line Cook",
		Locale:      "en",
	})
	if err != nil {
		t.Fatalf("second registration failed: %v", err)
	}
	if len(res2.User.Roles) == 0 || res2.User.Roles[0] != "COOK" {
		t.Errorf("expected second user to have COOK role, got: %v", res2.User.Roles)
	}

	// 3. Duplicate email should fail
	_, err = svc.Register(ctx, application.RegisterInput{
		Email:       "owner@mookrob.com",
		Password:    "AnotherPass123!",
		DisplayName: "Duplicate Chef",
	})
	if err == nil {
		t.Errorf("expected duplicate email error, got nil")
	}

	// 4. Invalid email format should fail
	_, err = svc.Register(ctx, application.RegisterInput{
		Email:       "invalid-email",
		Password:    "SecurePass123!",
		DisplayName: "Invalid Chef",
	})
	if err == nil {
		t.Errorf("expected invalid email validation error, got nil")
	}

	// 5. Short password should fail
	_, err = svc.Register(ctx, application.RegisterInput{
		Email:       "short@mookrob.com",
		Password:    "short",
		DisplayName: "Short Chef",
	})
	if err == nil {
		t.Errorf("expected short password validation error, got nil")
	}

	// 6. Login with registered user should succeed
	loginRes, err := svc.Login(ctx, "owner@mookrob.com", "SecurePass123!")
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
	if loginRes.User.Email != "owner@mookrob.com" {
		t.Errorf("expected email to match, got %s", loginRes.User.Email)
	}

	// 7. Login with wrong password should fail
	_, err = svc.Login(ctx, "owner@mookrob.com", "WrongPassword")
	if err == nil {
		t.Errorf("expected invalid credentials error, got nil")
	}
}
