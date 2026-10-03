package application

import (
	"context"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/domain/identity"
	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type UserService struct {
	userRepo identity.UserRepository
	roleRepo identity.RoleRepository
	hasher   ports.PasswordHasher
	clock    ports.Clock
	idGen    ports.IDGen
}

func NewUserService(
	userRepo identity.UserRepository,
	roleRepo identity.RoleRepository,
	hasher ports.PasswordHasher,
	clock ports.Clock,
	idGen ports.IDGen,
) *UserService {
	return &UserService{
		userRepo: userRepo,
		roleRepo: roleRepo,
		hasher:   hasher,
		clock:    clock,
		idGen:    idGen,
	}
}

type CreateUserInput struct {
	Email       string      `json:"email"`
	DisplayName string      `json:"displayName"`
	Password    string      `json:"password"`
	Locale      string      `json:"locale"`
	RoleIDs     []uuid.UUID `json:"roleIds"`
	IsActive    bool        `json:"isActive"`
}

type UpdateUserInput struct {
	DisplayName string      `json:"displayName"`
	Locale      string      `json:"locale"`
	RoleIDs     []uuid.UUID `json:"roleIds"`
	IsActive    bool        `json:"isActive"`
	Version     int         `json:"version"`
}

func (s *UserService) List(ctx context.Context, params pagination.Params) (pagination.Paged[identity.User], error) {
	users, total, err := s.userRepo.List(params.Q, params.Limit(), params.Offset())
	if err != nil {
		return pagination.Paged[identity.User]{}, err
	}
	return pagination.NewPaged(users, params.Page, params.PageSize, total), nil
}

func (s *UserService) GetByID(ctx context.Context, id uuid.UUID) (*identity.User, error) {
	return s.userRepo.GetByID(id)
}

func (s *UserService) Create(ctx context.Context, input CreateUserInput) (*identity.User, error) {
	if input.Email == "" || input.DisplayName == "" || input.Password == "" {
		return nil, apperror.Validation("missing required fields")
	}

	existing, _ := s.userRepo.GetByEmail(input.Email)
	if existing != nil {
		return nil, apperror.Duplicate("user with this email already exists")
	}

	hash, err := s.hasher.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	var roles []identity.Role
	for _, rID := range input.RoleIDs {
		r, err := s.roleRepo.GetByID(rID)
		if err == nil {
			roles = append(roles, *r)
		}
	}

	locale := input.Locale
	if locale == "" {
		locale = "th"
	}

	u := &identity.User{
		ID:           s.idGen.NewUUID(),
		Email:        input.Email,
		DisplayName:  input.DisplayName,
		PasswordHash: hash,
		Locale:       locale,
		IsActive:     input.IsActive,
		Roles:        roles,
		Version:      1,
		CreatedAt:    s.clock.Now(),
		UpdatedAt:    s.clock.Now(),
	}

	if err := s.userRepo.Create(u); err != nil {
		return nil, err
	}

	return u, nil
}

func (s *UserService) Update(ctx context.Context, id uuid.UUID, input UpdateUserInput) (*identity.User, error) {
	u, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	u.DisplayName = input.DisplayName
	if input.Locale != "" {
		u.Locale = input.Locale
	}
	u.IsActive = input.IsActive
	u.Version = input.Version

	var roles []identity.Role
	for _, rID := range input.RoleIDs {
		r, err := s.roleRepo.GetByID(rID)
		if err == nil {
			roles = append(roles, *r)
		}
	}
	u.Roles = roles

	if err := s.userRepo.Update(u); err != nil {
		return nil, err
	}

	return s.userRepo.GetByID(id)
}

func (s *UserService) ResetPassword(ctx context.Context, id uuid.UUID, newPassword string) error {
	if len(newPassword) < 6 {
		return apperror.Validation("password must be at least 6 characters")
	}

	hash, err := s.hasher.HashPassword(newPassword)
	if err != nil {
		return err
	}

	return s.userRepo.UpdatePassword(id, hash)
}

func (s *UserService) ListRoles(ctx context.Context) ([]identity.Role, error) {
	return s.roleRepo.List()
}

func (s *UserService) UpdateRolePermissions(ctx context.Context, roleID uuid.UUID, permissionCodes []string) (*identity.Role, error) {
	if err := s.roleRepo.UpdatePermissions(roleID, permissionCodes); err != nil {
		return nil, err
	}
	return s.roleRepo.GetByID(roleID)
}

func (s *UserService) ListPermissions(ctx context.Context) ([]identity.Permission, error) {
	return s.roleRepo.ListPermissions()
}
