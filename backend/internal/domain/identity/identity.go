package identity

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	DisplayName  string    `json:"displayName"`
	PasswordHash string    `json:"-"`
	Locale       string    `json:"locale"`
	IsActive     bool      `json:"isActive"`
	Roles        []Role    `json:"roles"`
	Version      int       `json:"version"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Role struct {
	ID          uuid.UUID `json:"id"`
	Code        string    `json:"code"`
	NameTh      string    `json:"nameTh"`
	NameEn      string    `json:"nameEn"`
	Permissions []string  `json:"permissions"`
}

type Permission struct {
	Code          string `json:"code"`
	DescriptionTh string `json:"descriptionTh"`
	DescriptionEn string `json:"descriptionEn"`
	Group         string `json:"group"`
}

type RefreshToken struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"userId"`
	TokenHash string    `json:"-"`
	FamilyID  uuid.UUID `json:"familyId"`
	IsRevoked bool      `json:"isRevoked"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
}

type UserRepository interface {
	GetByID(id uuid.UUID) (*User, error)
	GetByEmail(email string) (*User, error)
	List(q string, limit, offset int) ([]User, int, error)
	Create(u *User) error
	Update(u *User) error
	UpdatePassword(id uuid.UUID, passwordHash string) error
	GetRoles(userID uuid.UUID) ([]Role, error)
	GetPermissions(userID uuid.UUID) ([]string, error)
	Count() (int, error)
}

type RoleRepository interface {
	List() ([]Role, error)
	GetByID(id uuid.UUID) (*Role, error)
	GetByCode(code string) (*Role, error)
	UpdatePermissions(roleID uuid.UUID, permissionCodes []string) error
	ListPermissions() ([]Permission, error)
}

type RefreshTokenRepository interface {
	Create(token *RefreshToken) error
	GetByHash(tokenHash string) (*RefreshToken, error)
	RevokeFamily(familyID uuid.UUID) error
	Revoke(id uuid.UUID) error
}
