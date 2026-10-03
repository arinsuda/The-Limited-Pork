package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mookrob/backend/internal/domain/masterdata"
	"github.com/mookrob/backend/pkg/apperror"
)

type MasterDataRepo struct {
	pool *pgxpool.Pool
}

func NewMasterDataRepo(pool *pgxpool.Pool) *MasterDataRepo {
	return &MasterDataRepo{pool: pool}
}

// ---- Units ----

func (r *MasterDataRepo) ListUnits(includeInactive bool) ([]masterdata.Unit, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, code, symbol, dimension, base_unit_id, factor_to_base, name_th, name_en, sort_order, is_active, version, created_at, updated_at
		FROM units
		WHERE deleted_at IS NULL
	`
	if !includeInactive {
		query += " AND is_active = true"
	}
	query += " ORDER BY sort_order ASC, code ASC"

	rows, err := q.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var units []masterdata.Unit
	for rows.Next() {
		var u masterdata.Unit
		if err := rows.Scan(
			&u.ID, &u.Code, &u.Symbol, &u.Dimension, &u.BaseUnitID, &u.FactorToBase,
			&u.NameTh, &u.NameEn, &u.SortOrder, &u.IsActive, &u.Version, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, err
		}
		units = append(units, u)
	}
	return units, nil
}

func (r *MasterDataRepo) GetUnitByID(id uuid.UUID) (*masterdata.Unit, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, code, symbol, dimension, base_unit_id, factor_to_base, name_th, name_en, sort_order, is_active, version, created_at, updated_at
		FROM units
		WHERE id = $1 AND deleted_at IS NULL
	`
	var u masterdata.Unit
	err := q.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Code, &u.Symbol, &u.Dimension, &u.BaseUnitID, &u.FactorToBase,
		&u.NameTh, &u.NameEn, &u.SortOrder, &u.IsActive, &u.Version, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("unit", id.String())
		}
		return nil, err
	}
	return &u, nil
}

func (r *MasterDataRepo) CreateUnit(u *masterdata.Unit) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		INSERT INTO units (id, code, symbol, dimension, base_unit_id, factor_to_base, name_th, name_en, sort_order, is_active, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`
	_, err := q.Exec(ctx, query,
		u.ID, u.Code, u.Symbol, u.Dimension, u.BaseUnitID, u.FactorToBase,
		u.NameTh, u.NameEn, u.SortOrder, u.IsActive, u.Version, u.CreatedAt, u.UpdatedAt,
	)
	return err
}

func (r *MasterDataRepo) UpdateUnit(u *masterdata.Unit) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		UPDATE units
		SET symbol = $1, dimension = $2, base_unit_id = $3, factor_to_base = $4,
		    name_th = $5, name_en = $6, sort_order = $7, is_active = $8,
		    version = version + 1, updated_at = NOW()
		WHERE id = $9 AND version = $10 AND deleted_at IS NULL
	`
	tag, err := q.Exec(ctx, query,
		u.Symbol, u.Dimension, u.BaseUnitID, u.FactorToBase,
		u.NameTh, u.NameEn, u.SortOrder, u.IsActive,
		u.ID, u.Version,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.VersionConflict("unit was modified concurrently or not found")
	}
	return nil
}

func (r *MasterDataRepo) DeleteUnit(id uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	tag, err := q.Exec(ctx, `UPDATE units SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.NotFound("unit", id.String())
	}
	return nil
}

// ---- Taste Attributes ----

func (r *MasterDataRepo) ListTasteAttributes(includeInactive bool) ([]masterdata.TasteAttribute, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, code, name_th, name_en, description_th, description_en, min_score, max_score, color, sort_order, is_active, version, created_at, updated_at
		FROM taste_attributes
		WHERE deleted_at IS NULL
	`
	if !includeInactive {
		query += " AND is_active = true"
	}
	query += " ORDER BY sort_order ASC, code ASC"

	rows, err := q.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attrs []masterdata.TasteAttribute
	for rows.Next() {
		var a masterdata.TasteAttribute
		if err := rows.Scan(
			&a.ID, &a.Code, &a.NameTh, &a.NameEn, &a.DescriptionTh, &a.DescriptionEn,
			&a.MinScore, &a.MaxScore, &a.Color, &a.SortOrder, &a.IsActive, &a.Version, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, err
		}
		attrs = append(attrs, a)
	}
	return attrs, nil
}

func (r *MasterDataRepo) GetTasteAttributeByID(id uuid.UUID) (*masterdata.TasteAttribute, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, code, name_th, name_en, description_th, description_en, min_score, max_score, color, sort_order, is_active, version, created_at, updated_at
		FROM taste_attributes
		WHERE id = $1 AND deleted_at IS NULL
	`
	var a masterdata.TasteAttribute
	err := q.QueryRow(ctx, query, id).Scan(
		&a.ID, &a.Code, &a.NameTh, &a.NameEn, &a.DescriptionTh, &a.DescriptionEn,
		&a.MinScore, &a.MaxScore, &a.Color, &a.SortOrder, &a.IsActive, &a.Version, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("taste_attribute", id.String())
		}
		return nil, err
	}
	return &a, nil
}

func (r *MasterDataRepo) CreateTasteAttribute(t *masterdata.TasteAttribute) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		INSERT INTO taste_attributes (id, code, name_th, name_en, description_th, description_en, min_score, max_score, color, sort_order, is_active, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	_, err := q.Exec(ctx, query,
		t.ID, t.Code, t.NameTh, t.NameEn, t.DescriptionTh, t.DescriptionEn,
		t.MinScore, t.MaxScore, t.Color, t.SortOrder, t.IsActive, t.Version, t.CreatedAt, t.UpdatedAt,
	)
	return err
}

func (r *MasterDataRepo) UpdateTasteAttribute(t *masterdata.TasteAttribute) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		UPDATE taste_attributes
		SET name_th = $1, name_en = $2, description_th = $3, description_en = $4,
		    min_score = $5, max_score = $6, color = $7, sort_order = $8, is_active = $9,
		    version = version + 1, updated_at = NOW()
		WHERE id = $10 AND version = $11 AND deleted_at IS NULL
	`
	tag, err := q.Exec(ctx, query,
		t.NameTh, t.NameEn, t.DescriptionTh, t.DescriptionEn,
		t.MinScore, t.MaxScore, t.Color, t.SortOrder, t.IsActive,
		t.ID, t.Version,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.VersionConflict("taste attribute was modified concurrently or not found")
	}
	return nil
}

func (r *MasterDataRepo) DeleteTasteAttribute(id uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	tag, err := q.Exec(ctx, `UPDATE taste_attributes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.NotFound("taste attribute", id.String())
	}
	return nil
}

// ---- Process Step Types ----

func (r *MasterDataRepo) ListProcessStepTypes(includeInactive bool) ([]masterdata.ProcessStepType, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, code, name_th, name_en, icon, uses_temperature, uses_duration, uses_orientation, is_repeatable, param_schema, sort_order, is_active, version, created_at, updated_at
		FROM process_step_types
		WHERE deleted_at IS NULL
	`
	if !includeInactive {
		query += " AND is_active = true"
	}
	query += " ORDER BY sort_order ASC, code ASC"

	rows, err := q.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var types []masterdata.ProcessStepType
	for rows.Next() {
		var p masterdata.ProcessStepType
		var paramSchemaBytes []byte
		if err := rows.Scan(
			&p.ID, &p.Code, &p.NameTh, &p.NameEn, &p.Icon,
			&p.UsesTemperature, &p.UsesDuration, &p.UsesOrientation, &p.IsRepeatable,
			&paramSchemaBytes, &p.SortOrder, &p.IsActive, &p.Version, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(paramSchemaBytes, &p.ParamSchema)
		types = append(types, p)
	}
	return types, nil
}

func (r *MasterDataRepo) GetProcessStepTypeByID(id uuid.UUID) (*masterdata.ProcessStepType, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, code, name_th, name_en, icon, uses_temperature, uses_duration, uses_orientation, is_repeatable, param_schema, sort_order, is_active, version, created_at, updated_at
		FROM process_step_types
		WHERE id = $1 AND deleted_at IS NULL
	`
	var p masterdata.ProcessStepType
	var paramSchemaBytes []byte
	err := q.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.Code, &p.NameTh, &p.NameEn, &p.Icon,
		&p.UsesTemperature, &p.UsesDuration, &p.UsesOrientation, &p.IsRepeatable,
		&paramSchemaBytes, &p.SortOrder, &p.IsActive, &p.Version, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("process step type", id.String())
		}
		return nil, err
	}
	_ = json.Unmarshal(paramSchemaBytes, &p.ParamSchema)
	return &p, nil
}

func (r *MasterDataRepo) CreateProcessStepType(p *masterdata.ProcessStepType) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	schemaBytes, _ := json.Marshal(p.ParamSchema)
	query := `
		INSERT INTO process_step_types (id, code, name_th, name_en, icon, uses_temperature, uses_duration, uses_orientation, is_repeatable, param_schema, sort_order, is_active, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`
	_, err := q.Exec(ctx, query,
		p.ID, p.Code, p.NameTh, p.NameEn, p.Icon,
		p.UsesTemperature, p.UsesDuration, p.UsesOrientation, p.IsRepeatable,
		schemaBytes, p.SortOrder, p.IsActive, p.Version, p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func (r *MasterDataRepo) UpdateProcessStepType(p *masterdata.ProcessStepType) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	schemaBytes, _ := json.Marshal(p.ParamSchema)
	query := `
		UPDATE process_step_types
		SET name_th = $1, name_en = $2, icon = $3, uses_temperature = $4,
		    uses_duration = $5, uses_orientation = $6, is_repeatable = $7,
		    param_schema = $8, sort_order = $9, is_active = $10,
		    version = version + 1, updated_at = NOW()
		WHERE id = $11 AND version = $12 AND deleted_at IS NULL
	`
	tag, err := q.Exec(ctx, query,
		p.NameTh, p.NameEn, p.Icon, p.UsesTemperature,
		p.UsesDuration, p.UsesOrientation, p.IsRepeatable,
		schemaBytes, p.SortOrder, p.IsActive,
		p.ID, p.Version,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.VersionConflict("process step type was modified concurrently or not found")
	}
	return nil
}

func (r *MasterDataRepo) DeleteProcessStepType(id uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	tag, err := q.Exec(ctx, `UPDATE process_step_types SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.NotFound("process step type", id.String())
	}
	return nil
}

// ---- Lookups ----

func (r *MasterDataRepo) ListLookupCategories() ([]masterdata.LookupCategory, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	rows, err := q.Query(ctx, `SELECT code, name_th, name_en, is_system FROM lookup_categories ORDER BY code ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cats []masterdata.LookupCategory
	for rows.Next() {
		var c masterdata.LookupCategory
		if err := rows.Scan(&c.Code, &c.NameTh, &c.NameEn, &c.IsSystem); err != nil {
			return nil, err
		}
		cats = append(cats, c)
	}
	return cats, nil
}

func (r *MasterDataRepo) ListLookups(category string, includeInactive bool) ([]masterdata.Lookup, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, category, code, name_th, name_en, metadata, sort_order, is_active, version, created_at, updated_at
		FROM lookups
		WHERE deleted_at IS NULL
	`
	var args []any
	argIdx := 1
	if category != "" {
		query += fmt.Sprintf(" AND category = $%d", argIdx)
		args = append(args, category)
		argIdx++
	}
	if !includeInactive {
		query += " AND is_active = true"
	}
	query += " ORDER BY sort_order ASC, code ASC"

	rows, err := q.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []masterdata.Lookup
	for rows.Next() {
		var l masterdata.Lookup
		var metaBytes []byte
		if err := rows.Scan(
			&l.ID, &l.Category, &l.Code, &l.NameTh, &l.NameEn,
			&metaBytes, &l.SortOrder, &l.IsActive, &l.Version, &l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(metaBytes, &l.Metadata)
		list = append(list, l)
	}
	return list, nil
}

func (r *MasterDataRepo) GetLookupByID(id uuid.UUID) (*masterdata.Lookup, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, category, code, name_th, name_en, metadata, sort_order, is_active, version, created_at, updated_at
		FROM lookups
		WHERE id = $1 AND deleted_at IS NULL
	`
	var l masterdata.Lookup
	var metaBytes []byte
	err := q.QueryRow(ctx, query, id).Scan(
		&l.ID, &l.Category, &l.Code, &l.NameTh, &l.NameEn,
		&metaBytes, &l.SortOrder, &l.IsActive, &l.Version, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("lookup", id.String())
		}
		return nil, err
	}
	_ = json.Unmarshal(metaBytes, &l.Metadata)
	return &l, nil
}

func (r *MasterDataRepo) CreateLookup(l *masterdata.Lookup) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	metaBytes, _ := json.Marshal(l.Metadata)
	query := `
		INSERT INTO lookups (id, category, code, name_th, name_en, metadata, sort_order, is_active, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := q.Exec(ctx, query,
		l.ID, l.Category, l.Code, l.NameTh, l.NameEn,
		metaBytes, l.SortOrder, l.IsActive, l.Version, l.CreatedAt, l.UpdatedAt,
	)
	return err
}

func (r *MasterDataRepo) UpdateLookup(l *masterdata.Lookup) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	metaBytes, _ := json.Marshal(l.Metadata)
	query := `
		UPDATE lookups
		SET name_th = $1, name_en = $2, metadata = $3, sort_order = $4, is_active = $5,
		    version = version + 1, updated_at = NOW()
		WHERE id = $6 AND version = $7 AND deleted_at IS NULL
	`
	tag, err := q.Exec(ctx, query,
		l.NameTh, l.NameEn, metaBytes, l.SortOrder, l.IsActive,
		l.ID, l.Version,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.VersionConflict("lookup was modified concurrently or not found")
	}
	return nil
}

func (r *MasterDataRepo) DeleteLookup(id uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	tag, err := q.Exec(ctx, `UPDATE lookups SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.NotFound("lookup", id.String())
	}
	return nil
}

// ---- Ingredients ----

func (r *MasterDataRepo) ListIngredients(categoryID *uuid.UUID, includeInactive bool, search string, limit, offset int) ([]masterdata.Ingredient, int, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	whereClause := "WHERE i.deleted_at IS NULL"
	var args []any
	argIdx := 1

	if categoryID != nil {
		whereClause += fmt.Sprintf(" AND i.category_id = $%d", argIdx)
		args = append(args, *categoryID)
		argIdx++
	}
	if !includeInactive {
		whereClause += " AND i.is_active = true"
	}
	if search != "" {
		whereClause += fmt.Sprintf(" AND (i.name_th ILIKE $%d OR i.name_en ILIKE $%d OR i.code ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	countQuery := "SELECT COUNT(*) FROM ingredients i " + whereClause
	var total int
	if err := q.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT i.id, i.code, i.name_th, i.name_en, i.category_id, i.default_unit_id, i.notes,
		       i.sort_order, i.is_active, i.version, i.created_at, i.updated_at,
		       u.id, u.code, u.symbol, u.name_th, u.name_en,
		       l.id, l.code, l.name_th, l.name_en
		FROM ingredients i
		JOIN units u ON u.id = i.default_unit_id
		LEFT JOIN lookups l ON l.id = i.category_id
		%s
		ORDER BY i.sort_order ASC, i.code ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := q.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []masterdata.Ingredient
	for rows.Next() {
		var ing masterdata.Ingredient
		var unit masterdata.Unit
		var catID *uuid.UUID
		var catCode, catNameTh, catNameEn *string

		if err := rows.Scan(
			&ing.ID, &ing.Code, &ing.NameTh, &ing.NameEn, &ing.CategoryID, &ing.DefaultUnitID, &ing.Notes,
			&ing.SortOrder, &ing.IsActive, &ing.Version, &ing.CreatedAt, &ing.UpdatedAt,
			&unit.ID, &unit.Code, &unit.Symbol, &unit.NameTh, &unit.NameEn,
			&catID, &catCode, &catNameTh, &catNameEn,
		); err != nil {
			return nil, 0, err
		}
		ing.DefaultUnit = &unit
		if catID != nil && catCode != nil {
			ing.Category = &masterdata.Lookup{
				ID:     *catID,
				Code:   *catCode,
				NameTh: *catNameTh,
				NameEn: *catNameEn,
			}
		}
		list = append(list, ing)
	}

	return list, total, nil
}

func (r *MasterDataRepo) GetIngredientByID(id uuid.UUID) (*masterdata.Ingredient, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT i.id, i.code, i.name_th, i.name_en, i.category_id, i.default_unit_id, i.notes,
		       i.sort_order, i.is_active, i.version, i.created_at, i.updated_at,
		       u.id, u.code, u.symbol, u.name_th, u.name_en,
		       l.id, l.code, l.name_th, l.name_en
		FROM ingredients i
		JOIN units u ON u.id = i.default_unit_id
		LEFT JOIN lookups l ON l.id = i.category_id
		WHERE i.id = $1 AND i.deleted_at IS NULL
	`
	var ing masterdata.Ingredient
	var unit masterdata.Unit
	var catID *uuid.UUID
	var catCode, catNameTh, catNameEn *string

	err := q.QueryRow(ctx, query, id).Scan(
		&ing.ID, &ing.Code, &ing.NameTh, &ing.NameEn, &ing.CategoryID, &ing.DefaultUnitID, &ing.Notes,
		&ing.SortOrder, &ing.IsActive, &ing.Version, &ing.CreatedAt, &ing.UpdatedAt,
		&unit.ID, &unit.Code, &unit.Symbol, &unit.NameTh, &unit.NameEn,
		&catID, &catCode, &catNameTh, &catNameEn,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("ingredient", id.String())
		}
		return nil, err
	}
	ing.DefaultUnit = &unit
	if catID != nil && catCode != nil {
		ing.Category = &masterdata.Lookup{
			ID:     *catID,
			Code:   *catCode,
			NameTh: *catNameTh,
			NameEn: *catNameEn,
		}
	}
	return &ing, nil
}

func (r *MasterDataRepo) CreateIngredient(i *masterdata.Ingredient) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		INSERT INTO ingredients (id, code, name_th, name_en, category_id, default_unit_id, notes, sort_order, is_active, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := q.Exec(ctx, query,
		i.ID, i.Code, i.NameTh, i.NameEn, i.CategoryID, i.DefaultUnitID, i.Notes,
		i.SortOrder, i.IsActive, i.Version, i.CreatedAt, i.UpdatedAt,
	)
	return err
}

func (r *MasterDataRepo) UpdateIngredient(i *masterdata.Ingredient) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		UPDATE ingredients
		SET name_th = $1, name_en = $2, category_id = $3, default_unit_id = $4, notes = $5,
		    sort_order = $6, is_active = $7, version = version + 1, updated_at = NOW()
		WHERE id = $8 AND version = $9 AND deleted_at IS NULL
	`
	tag, err := q.Exec(ctx, query,
		i.NameTh, i.NameEn, i.CategoryID, i.DefaultUnitID, i.Notes,
		i.SortOrder, i.IsActive, i.ID, i.Version,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.VersionConflict("ingredient was modified concurrently or not found")
	}
	return nil
}

func (r *MasterDataRepo) DeleteIngredient(id uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	tag, err := q.Exec(ctx, `UPDATE ingredients SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.NotFound("ingredient", id.String())
	}
	return nil
}

// ---- Settings ----

func (r *MasterDataRepo) ListSettings(publicOnly bool) ([]masterdata.Setting, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT key, value, value_type, description_th, description_en, is_public, version, updated_at
		FROM settings
	`
	if publicOnly {
		query += " WHERE is_public = true"
	}
	query += " ORDER BY key ASC"

	rows, err := q.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []masterdata.Setting
	for rows.Next() {
		var s masterdata.Setting
		var valBytes []byte
		if err := rows.Scan(
			&s.Key, &valBytes, &s.ValueType, &s.DescriptionTh, &s.DescriptionEn,
			&s.IsPublic, &s.Version, &s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(valBytes, &s.Value)
		list = append(list, s)
	}
	return list, nil
}

func (r *MasterDataRepo) GetSetting(key string) (*masterdata.Setting, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT key, value, value_type, description_th, description_en, is_public, version, updated_at
		FROM settings
		WHERE key = $1
	`
	var s masterdata.Setting
	var valBytes []byte
	err := q.QueryRow(ctx, query, key).Scan(
		&s.Key, &valBytes, &s.ValueType, &s.DescriptionTh, &s.DescriptionEn,
		&s.IsPublic, &s.Version, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("setting", key)
		}
		return nil, err
	}
	_ = json.Unmarshal(valBytes, &s.Value)
	return &s, nil
}

func (r *MasterDataRepo) UpdateSetting(key string, value any, version int) (*masterdata.Setting, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	valBytes, err := json.Marshal(value)
	if err != nil {
		return nil, apperror.BadRequest("invalid setting value json")
	}

	query := `
		UPDATE settings
		SET value = $1, version = version + 1, updated_at = NOW()
		WHERE key = $2 AND version = $3
		RETURNING key, value, value_type, description_th, description_en, is_public, version, updated_at
	`
	var s masterdata.Setting
	var resBytes []byte
	err = q.QueryRow(ctx, query, valBytes, key, version).Scan(
		&s.Key, &resBytes, &s.ValueType, &s.DescriptionTh, &s.DescriptionEn,
		&s.IsPublic, &s.Version, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.VersionConflict("setting was modified concurrently or not found")
		}
		return nil, err
	}
	_ = json.Unmarshal(resBytes, &s.Value)
	return &s, nil
}
