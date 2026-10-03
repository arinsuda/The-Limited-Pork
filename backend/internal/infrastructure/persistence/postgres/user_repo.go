package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mookrob/backend/internal/domain/identity"
	"github.com/mookrob/backend/pkg/apperror"
)

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

func (r *UserRepo) GetByID(id uuid.UUID) (*identity.User, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, email, display_name, password_hash, locale, is_active, version, created_at, updated_at
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`
	var u identity.User
	err := q.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.DisplayName, &u.PasswordHash,
		&u.Locale, &u.IsActive, &u.Version, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("user", id.String())
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	roles, err := r.GetRoles(u.ID)
	if err != nil {
		return nil, err
	}
	u.Roles = roles

	return &u, nil
}

func (r *UserRepo) GetByEmail(email string) (*identity.User, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, email, display_name, password_hash, locale, is_active, version, created_at, updated_at
		FROM users
		WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
	`
	var u identity.User
	err := q.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.DisplayName, &u.PasswordHash,
		&u.Locale, &u.IsActive, &u.Version, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("user", email)
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	roles, err := r.GetRoles(u.ID)
	if err != nil {
		return nil, err
	}
	u.Roles = roles

	return &u, nil
}

func (r *UserRepo) List(search string, limit, offset int) ([]identity.User, int, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	whereClause := "WHERE deleted_at IS NULL"
	var args []any
	argIdx := 1

	if search != "" {
		whereClause += fmt.Sprintf(" AND (email ILIKE $%d OR display_name ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	countQuery := "SELECT COUNT(*) FROM users " + whereClause
	var total int
	if err := q.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT id, email, display_name, password_hash, locale, is_active, version, created_at, updated_at
		FROM users
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := q.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []identity.User
	for rows.Next() {
		var u identity.User
		if err := rows.Scan(
			&u.ID, &u.Email, &u.DisplayName, &u.PasswordHash,
			&u.Locale, &u.IsActive, &u.Version, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}

	for i := range users {
		roles, err := r.GetRoles(users[i].ID)
		if err == nil {
			users[i].Roles = roles
		}
	}

	return users, total, nil
}

func (r *UserRepo) Create(u *identity.User) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		INSERT INTO users (id, email, display_name, password_hash, locale, is_active, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := q.Exec(ctx, query,
		u.ID, u.Email, u.DisplayName, u.PasswordHash,
		u.Locale, u.IsActive, u.Version, u.CreatedAt, u.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	// Insert user roles
	for _, role := range u.Roles {
		_, err = q.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, u.ID, role.ID)
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *UserRepo) Update(u *identity.User) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		UPDATE users
		SET display_name = $1, locale = $2, is_active = $3, version = version + 1, updated_at = NOW()
		WHERE id = $4 AND version = $5 AND deleted_at IS NULL
	`
	tag, err := q.Exec(ctx, query, u.DisplayName, u.Locale, u.IsActive, u.ID, u.Version)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return apperror.VersionConflict("user was modified concurrently or not found")
	}

	// Update roles
	_, _ = q.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1`, u.ID)
	for _, role := range u.Roles {
		_, _ = q.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, u.ID, role.ID)
	}

	return nil
}

func (r *UserRepo) UpdatePassword(id uuid.UUID, passwordHash string) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `UPDATE users SET password_hash = $1, version = version + 1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL`
	tag, err := q.Exec(ctx, query, passwordHash, id)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return apperror.NotFound("user", id.String())
	}
	return nil
}

func (r *UserRepo) GetRoles(userID uuid.UUID) ([]identity.Role, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT r.id, r.code, r.name_th, r.name_en
		FROM roles r
		JOIN user_roles ur ON ur.role_id = r.id
		WHERE ur.user_id = $1
		ORDER BY r.code ASC
	`
	rows, err := q.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []identity.Role
	for rows.Next() {
		var role identity.Role
		if err := rows.Scan(&role.ID, &role.Code, &role.NameTh, &role.NameEn); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, nil
}

func (r *UserRepo) GetPermissions(userID uuid.UUID) ([]string, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT DISTINCT rp.permission_code
		FROM role_permissions rp
		JOIN user_roles ur ON ur.role_id = rp.role_id
		WHERE ur.user_id = $1
		ORDER BY rp.permission_code ASC
	`
	rows, err := q.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, nil
}

func (r *UserRepo) Count() (int, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	var count int
	err := q.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`).Scan(&count)
	return count, err
}

// ---- Role Repo ----

type RoleRepo struct {
	pool *pgxpool.Pool
}

func NewRoleRepo(pool *pgxpool.Pool) *RoleRepo {
	return &RoleRepo{pool: pool}
}

func (r *RoleRepo) List() ([]identity.Role, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	rows, err := q.Query(ctx, `SELECT id, code, name_th, name_en FROM roles ORDER BY code ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []identity.Role
	for rows.Next() {
		var role identity.Role
		if err := rows.Scan(&role.ID, &role.Code, &role.NameTh, &role.NameEn); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}

	for i := range roles {
		permsRows, err := q.Query(ctx, `SELECT permission_code FROM role_permissions WHERE role_id = $1`, roles[i].ID)
		if err == nil {
			var perms []string
			for permsRows.Next() {
				var p string
				if err := permsRows.Scan(&p); err == nil {
					perms = append(perms, p)
				}
			}
			permsRows.Close()
			roles[i].Permissions = perms
		}
	}

	return roles, nil
}

func (r *RoleRepo) GetByID(id uuid.UUID) (*identity.Role, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	var role identity.Role
	err := q.QueryRow(ctx, `SELECT id, code, name_th, name_en FROM roles WHERE id = $1`, id).Scan(
		&role.ID, &role.Code, &role.NameTh, &role.NameEn,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("role", id.String())
		}
		return nil, err
	}

	permsRows, err := q.Query(ctx, `SELECT permission_code FROM role_permissions WHERE role_id = $1`, role.ID)
	if err == nil {
		var perms []string
		for permsRows.Next() {
			var p string
			if err := permsRows.Scan(&p); err == nil {
				perms = append(perms, p)
			}
		}
		permsRows.Close()
		role.Permissions = perms
	}

	return &role, nil
}

func (r *RoleRepo) GetByCode(code string) (*identity.Role, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	var role identity.Role
	err := q.QueryRow(ctx, `SELECT id, code, name_th, name_en FROM roles WHERE code = $1`, code).Scan(
		&role.ID, &role.Code, &role.NameTh, &role.NameEn,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("role", code)
		}
		return nil, err
	}
	return &role, nil
}

func (r *RoleRepo) UpdatePermissions(roleID uuid.UUID, permissionCodes []string) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	_, err := q.Exec(ctx, `DELETE FROM role_permissions WHERE role_id = $1`, roleID)
	if err != nil {
		return err
	}

	for _, code := range permissionCodes {
		_, err = q.Exec(ctx, `INSERT INTO role_permissions (role_id, permission_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`, roleID, code)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *RoleRepo) ListPermissions() ([]identity.Permission, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	rows, err := q.Query(ctx, `SELECT code, description_th, description_en, group_name FROM permissions ORDER BY group_name, code`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []identity.Permission
	for rows.Next() {
		var p identity.Permission
		if err := rows.Scan(&p.Code, &p.DescriptionTh, &p.DescriptionEn, &p.Group); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, nil
}

// ---- Refresh Token Repo ----

type RefreshTokenRepo struct {
	pool *pgxpool.Pool
}

func NewRefreshTokenRepo(pool *pgxpool.Pool) *RefreshTokenRepo {
	return &RefreshTokenRepo{pool: pool}
}

func (r *RefreshTokenRepo) Create(token *identity.RefreshToken) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, is_revoked, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := q.Exec(ctx, query, token.ID, token.UserID, token.TokenHash, token.FamilyID, token.IsRevoked, token.ExpiresAt, token.CreatedAt)
	return err
}

func (r *RefreshTokenRepo) GetByHash(tokenHash string) (*identity.RefreshToken, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, user_id, token_hash, family_id, is_revoked, expires_at, created_at
		FROM refresh_tokens
		WHERE token_hash = $1
	`
	var t identity.RefreshToken
	err := q.QueryRow(ctx, query, tokenHash).Scan(
		&t.ID, &t.UserID, &t.TokenHash, &t.FamilyID, &t.IsRevoked, &t.ExpiresAt, &t.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.Unauthenticated("refresh token not found")
		}
		return nil, err
	}
	return &t, nil
}

func (r *RefreshTokenRepo) RevokeFamily(familyID uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	_, err := q.Exec(ctx, `UPDATE refresh_tokens SET is_revoked = true WHERE family_id = $1`, familyID)
	return err
}

func (r *RefreshTokenRepo) Revoke(id uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	_, err := q.Exec(ctx, `UPDATE refresh_tokens SET is_revoked = true WHERE id = $1`, id)
	return err
}
