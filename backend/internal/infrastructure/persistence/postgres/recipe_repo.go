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
	"github.com/mookrob/backend/internal/domain/recipe"
	"github.com/mookrob/backend/pkg/apperror"
)

type RecipeRepo struct {
	pool *pgxpool.Pool
}

func NewRecipeRepo(pool *pgxpool.Pool) *RecipeRepo {
	return &RecipeRepo{pool: pool}
}

func (r *RecipeRepo) NextRecipeCode(prefix string) (string, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	counterName := "recipe_code"
	query := `
		INSERT INTO counters (name, current_val)
		VALUES ($1, 1)
		ON CONFLICT (name) DO UPDATE
		SET current_val = counters.current_val + 1
		RETURNING current_val
	`
	var nextVal int64
	err := q.QueryRow(ctx, query, counterName).Scan(&nextVal)
	if err != nil {
		return "", fmt.Errorf("failed to increment counter: %w", err)
	}

	return recipe.FormatRecipeCode(prefix, nextVal), nil
}

func (r *RecipeRepo) List(status string, tagID *uuid.UUID, search string, limit, offset int) ([]recipe.Recipe, int, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	whereClause := "WHERE r.deleted_at IS NULL"
	var args []any
	argIdx := 1

	if status != "" {
		whereClause += fmt.Sprintf(" AND r.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	if tagID != nil {
		whereClause += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM recipe_tags rt WHERE rt.recipe_id = r.id AND rt.tag_id = $%d)", argIdx)
		args = append(args, *tagID)
		argIdx++
	}

	if search != "" {
		whereClause += fmt.Sprintf(" AND (r.name ILIKE $%d OR r.code ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	countQuery := "SELECT COUNT(*) FROM recipes r " + whereClause
	var total int
	if err := q.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT r.id, r.code, r.name, r.description, r.source_url, r.status, r.current_version_id, r.created_by,
		       r.version, r.created_at, r.updated_at,
		       COALESCE(rv.version_no, 1) as current_version_no,
		       (SELECT COUNT(*) FROM trials t WHERE t.recipe_id = r.id AND t.deleted_at IS NULL) as trial_count,
		       (SELECT TO_CHAR(MAX(t.trial_date), 'YYYY-MM-DD') FROM trials t WHERE t.recipe_id = r.id AND t.deleted_at IS NULL) as latest_trial_date,
		       (SELECT MAX(t.overall_score) FROM trials t WHERE t.recipe_id = r.id AND t.deleted_at IS NULL) as best_overall_score
		FROM recipes r
		LEFT JOIN recipe_versions rv ON rv.id = r.current_version_id
		%s
		ORDER BY r.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := q.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []recipe.Recipe
	for rows.Next() {
		var rec recipe.Recipe
		var curVerNo int
		var bestScore *float64
		var latestDate *string

		if err := rows.Scan(
			&rec.ID, &rec.Code, &rec.Name, &rec.Description, &rec.SourceURL, &rec.Status, &rec.CurrentVersionID, &rec.CreatedBy,
			&rec.Version, &rec.CreatedAt, &rec.UpdatedAt,
			&curVerNo, &rec.TrialCount, &latestDate, &bestScore,
		); err != nil {
			return nil, 0, err
		}
		rec.LatestTrialDate = latestDate
		rec.BestOverallScore = bestScore
		list = append(list, rec)
	}

	// Fetch tags and cover URL for each recipe
	for i := range list {
		tags, _ := r.getRecipeTags(ctx, q, list[i].ID)
		list[i].Tags = tags
	}

	return list, total, nil
}

func (r *RecipeRepo) getRecipeTags(ctx context.Context, q DBQuerier, recipeID uuid.UUID) ([]masterdata.Lookup, error) {
	query := `
		SELECT l.id, l.category, l.code, l.name_th, l.name_en, l.metadata, l.sort_order, l.is_active, l.version, l.created_at, l.updated_at
		FROM lookups l
		JOIN recipe_tags rt ON rt.tag_id = l.id
		WHERE rt.recipe_id = $1 AND l.deleted_at IS NULL
		ORDER BY l.sort_order ASC, l.code ASC
	`
	rows, err := q.Query(ctx, query, recipeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []masterdata.Lookup
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
		tags = append(tags, l)
	}
	return tags, nil
}

func (r *RecipeRepo) GetByID(id uuid.UUID) (*recipe.Recipe, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT r.id, r.code, r.name, r.description, r.source_url, r.status, r.current_version_id, r.created_by,
		       r.version, r.created_at, r.updated_at,
		       (SELECT COUNT(*) FROM trials t WHERE t.recipe_id = r.id AND t.deleted_at IS NULL) as trial_count,
		       (SELECT TO_CHAR(MAX(t.trial_date), 'YYYY-MM-DD') FROM trials t WHERE t.recipe_id = r.id AND t.deleted_at IS NULL) as latest_trial_date,
		       (SELECT MAX(t.overall_score) FROM trials t WHERE t.recipe_id = r.id AND t.deleted_at IS NULL) as best_overall_score
		FROM recipes r
		WHERE r.id = $1 AND r.deleted_at IS NULL
	`
	var rec recipe.Recipe
	var latestDate *string
	var bestScore *float64

	err := q.QueryRow(ctx, query, id).Scan(
		&rec.ID, &rec.Code, &rec.Name, &rec.Description, &rec.SourceURL, &rec.Status, &rec.CurrentVersionID, &rec.CreatedBy,
		&rec.Version, &rec.CreatedAt, &rec.UpdatedAt,
		&rec.TrialCount, &latestDate, &bestScore,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("recipe", id.String())
		}
		return nil, err
	}
	rec.LatestTrialDate = latestDate
	rec.BestOverallScore = bestScore

	tags, _ := r.getRecipeTags(ctx, q, rec.ID)
	rec.Tags = tags

	if rec.CurrentVersionID != nil {
		ver, err := r.GetVersionByID(*rec.CurrentVersionID)
		if err == nil {
			rec.CurrentVersion = ver
		}
	}

	return &rec, nil
}

func (r *RecipeRepo) GetByCode(code string) (*recipe.Recipe, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	var id uuid.UUID
	err := q.QueryRow(ctx, `SELECT id FROM recipes WHERE code = $1 AND deleted_at IS NULL`, code).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("recipe", code)
		}
		return nil, err
	}
	return r.GetByID(id)
}

func (r *RecipeRepo) Create(rec *recipe.Recipe, ver *recipe.Version, tagIDs []uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	// Insert Recipe
	recQuery := `
		INSERT INTO recipes (id, code, name, description, source_url, status, current_version_id, created_by, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := q.Exec(ctx, recQuery,
		rec.ID, rec.Code, rec.Name, rec.Description, rec.SourceURL, rec.Status, nil, rec.CreatedBy,
		rec.Version, rec.CreatedAt, rec.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert recipe: %w", err)
	}

	// Insert Version
	if err := r.createVersionInternal(ctx, q, ver); err != nil {
		return err
	}

	// Set current_version_id on recipe
	_, err = q.Exec(ctx, `UPDATE recipes SET current_version_id = $1 WHERE id = $2`, ver.ID, rec.ID)
	if err != nil {
		return fmt.Errorf("failed to set recipe current version: %w", err)
	}
	rec.CurrentVersionID = &ver.ID
	rec.CurrentVersion = ver

	// Insert tags
	for _, tagID := range tagIDs {
		_, _ = q.Exec(ctx, `INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, rec.ID, tagID)
	}

	return nil
}

func (r *RecipeRepo) Update(rec *recipe.Recipe, tagIDs []uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		UPDATE recipes
		SET name = $1, description = $2, source_url = $3, version = version + 1, updated_at = NOW()
		WHERE id = $4 AND version = $5 AND deleted_at IS NULL
	`
	tag, err := q.Exec(ctx, query, rec.Name, rec.Description, rec.SourceURL, rec.ID, rec.Version)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.VersionConflict("recipe was modified concurrently or not found")
	}

	// Update tags
	_, _ = q.Exec(ctx, `DELETE FROM recipe_tags WHERE recipe_id = $1`, rec.ID)
	for _, tagID := range tagIDs {
		_, _ = q.Exec(ctx, `INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, rec.ID, tagID)
	}

	return nil
}

func (r *RecipeRepo) UpdateStatus(id uuid.UUID, status recipe.Status, version int) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		UPDATE recipes
		SET status = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2 AND version = $3 AND deleted_at IS NULL
	`
	tag, err := q.Exec(ctx, query, status, id, version)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.VersionConflict("recipe was modified concurrently or not found")
	}
	return nil
}

func (r *RecipeRepo) Delete(id uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	tag, err := q.Exec(ctx, `UPDATE recipes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.NotFound("recipe", id.String())
	}
	return nil
}

// ---- Versions ----

func (r *RecipeRepo) createVersionInternal(ctx context.Context, q DBQuerier, ver *recipe.Version) error {
	query := `
		INSERT INTO recipe_versions (
			id, recipe_id, version_no, change_note, input_quantity, input_unit_id,
			expected_output_quantity, expected_output_unit_id, expected_yield_pct,
			notes, created_by, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := q.Exec(ctx, query,
		ver.ID, ver.RecipeID, ver.VersionNo, ver.ChangeNote, ver.InputQuantity, ver.InputUnitID,
		ver.ExpectedOutputQuantity, ver.ExpectedOutputUnitID, ver.ExpectedYieldPct,
		ver.Notes, ver.CreatedBy, ver.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert recipe version: %w", err)
	}

	// Insert Ingredients
	for _, ing := range ver.Ingredients {
		ingQuery := `
			INSERT INTO recipe_ingredients (id, version_id, line_no, ingredient_id, quantity, unit_id, preparation_note, is_optional)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`
		_, err := q.Exec(ctx, ingQuery,
			ing.ID, ver.ID, ing.LineNo, ing.IngredientID, ing.Quantity, ing.UnitID, ing.PreparationNote, ing.IsOptional,
		)
		if err != nil {
			return fmt.Errorf("failed to insert recipe ingredient: %w", err)
		}
	}

	// Insert Steps
	for _, step := range ver.Steps {
		paramsBytes, _ := json.Marshal(step.Params)
		stepQuery := `
			INSERT INTO process_steps (
				id, version_id, step_no, round_no, step_type_id, title, instruction,
				temperature_c, duration_minutes, orientation_id, params, notes
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		`
		_, err := q.Exec(ctx, stepQuery,
			step.ID, ver.ID, step.StepNo, step.RoundNo, step.StepTypeID, step.Title, step.Instruction,
			step.TemperatureC, step.DurationMinutes, step.OrientationID, paramsBytes, step.Notes,
		)
		if err != nil {
			return fmt.Errorf("failed to insert process step: %w", err)
		}
	}

	return nil
}

func (r *RecipeRepo) CreateVersion(ver *recipe.Version) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	if err := r.createVersionInternal(ctx, q, ver); err != nil {
		return err
	}

	return r.SetCurrentVersion(ver.RecipeID, ver.ID)
}

func (r *RecipeRepo) SetCurrentVersion(recipeID, versionID uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	_, err := q.Exec(ctx, `UPDATE recipes SET current_version_id = $1, updated_at = NOW() WHERE id = $2`, versionID, recipeID)
	return err
}

func (r *RecipeRepo) UpdateVersion(ver *recipe.Version) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		UPDATE recipe_versions
		SET change_note = $1, input_quantity = $2, input_unit_id = $3,
		    expected_output_quantity = $4, expected_output_unit_id = $5, expected_yield_pct = $6,
		    notes = $7
		WHERE id = $8
	`
	_, err := q.Exec(ctx, query,
		ver.ChangeNote, ver.InputQuantity, ver.InputUnitID,
		ver.ExpectedOutputQuantity, ver.ExpectedOutputUnitID, ver.ExpectedYieldPct,
		ver.Notes, ver.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update recipe version: %w", err)
	}

	// Delete and re-insert ingredients
	if _, err := q.Exec(ctx, `DELETE FROM recipe_ingredients WHERE version_id = $1`, ver.ID); err != nil {
		return fmt.Errorf("failed to delete old ingredients: %w", err)
	}
	for _, ing := range ver.Ingredients {
		ingQuery := `
			INSERT INTO recipe_ingredients (id, version_id, line_no, ingredient_id, quantity, unit_id, preparation_note, is_optional)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`
		_, err := q.Exec(ctx, ingQuery,
			ing.ID, ver.ID, ing.LineNo, ing.IngredientID, ing.Quantity, ing.UnitID, ing.PreparationNote, ing.IsOptional,
		)
		if err != nil {
			return fmt.Errorf("failed to insert recipe ingredient: %w", err)
		}
	}

	// Delete and re-insert steps
	if _, err := q.Exec(ctx, `DELETE FROM process_steps WHERE version_id = $1`, ver.ID); err != nil {
		return fmt.Errorf("failed to delete old process steps: %w", err)
	}
	for _, step := range ver.Steps {
		paramsBytes, _ := json.Marshal(step.Params)
		stepQuery := `
			INSERT INTO process_steps (
				id, version_id, step_no, round_no, step_type_id, title, instruction,
				temperature_c, duration_minutes, orientation_id, params, notes
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		`
		_, err := q.Exec(ctx, stepQuery,
			step.ID, ver.ID, step.StepNo, step.RoundNo, step.StepTypeID, step.Title, step.Instruction,
			step.TemperatureC, step.DurationMinutes, step.OrientationID, paramsBytes, step.Notes,
		)
		if err != nil {
			return fmt.Errorf("failed to insert process step: %w", err)
		}
	}

	return nil
}

func (r *RecipeRepo) CountTrialsByVersionID(versionID uuid.UUID) (int, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)
	var count int
	err := q.QueryRow(ctx, `SELECT COUNT(*) FROM trials WHERE recipe_version_id = $1 AND deleted_at IS NULL`, versionID).Scan(&count)
	return count, err
}

func (r *RecipeRepo) ListVersions(recipeID uuid.UUID) ([]recipe.Version, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT rv.id, rv.recipe_id, rv.version_no, rv.change_note, rv.input_quantity, rv.input_unit_id,
		       rv.expected_output_quantity, rv.expected_output_unit_id, rv.expected_yield_pct,
		       rv.notes, rv.created_by, rv.created_at,
		       (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.version_id = rv.id) AS ingredient_count,
		       (SELECT COUNT(*) FROM process_steps ps WHERE ps.version_id = rv.id) AS step_count,
		       (SELECT COUNT(*) FROM trials t WHERE t.recipe_version_id = rv.id) AS trial_count
		FROM recipe_versions rv
		WHERE rv.recipe_id = $1
		ORDER BY rv.version_no DESC
	`
	rows, err := q.Query(ctx, query, recipeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var versions []recipe.Version
	for rows.Next() {
		var v recipe.Version
		if err := rows.Scan(
			&v.ID, &v.RecipeID, &v.VersionNo, &v.ChangeNote, &v.InputQuantity, &v.InputUnitID,
			&v.ExpectedOutputQuantity, &v.ExpectedOutputUnitID, &v.ExpectedYieldPct,
			&v.Notes, &v.CreatedBy, &v.CreatedAt,
			&v.IngredientCount, &v.StepCount, &v.TrialCount,
		); err != nil {
			return nil, err
		}
		versions = append(versions, v)
	}
	return versions, nil
}

func (r *RecipeRepo) GetVersionByID(id uuid.UUID) (*recipe.Version, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, recipe_id, version_no, change_note, input_quantity, input_unit_id,
		       expected_output_quantity, expected_output_unit_id, expected_yield_pct,
		       notes, created_by, created_at
		FROM recipe_versions
		WHERE id = $1
	`
	var v recipe.Version
	err := q.QueryRow(ctx, query, id).Scan(
		&v.ID, &v.RecipeID, &v.VersionNo, &v.ChangeNote, &v.InputQuantity, &v.InputUnitID,
		&v.ExpectedOutputQuantity, &v.ExpectedOutputUnitID, &v.ExpectedYieldPct,
		&v.Notes, &v.CreatedBy, &v.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("recipe_version", id.String())
		}
		return nil, err
	}

	// Fetch input/output units
	if v.InputUnitID != nil {
		v.InputUnit, _ = r.getUnit(ctx, q, *v.InputUnitID)
	}
	if v.ExpectedOutputUnitID != nil {
		v.ExpectedOutputUnit, _ = r.getUnit(ctx, q, *v.ExpectedOutputUnitID)
	}

	// Fetch ingredients
	v.Ingredients, _ = r.getIngredients(ctx, q, v.ID)
	v.IngredientCount = len(v.Ingredients)

	// Fetch steps
	v.Steps, _ = r.getSteps(ctx, q, v.ID)
	v.StepCount = len(v.Steps)

	var trialCount int
	_ = q.QueryRow(ctx, `SELECT COUNT(*) FROM trials WHERE recipe_version_id = $1`, v.ID).Scan(&trialCount)
	v.TrialCount = trialCount

	return &v, nil
}

func (r *RecipeRepo) GetVersionByNo(recipeID uuid.UUID, versionNo int) (*recipe.Version, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	var id uuid.UUID
	err := q.QueryRow(ctx, `SELECT id FROM recipe_versions WHERE recipe_id = $1 AND version_no = $2`, recipeID, versionNo).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("recipe_version", fmt.Sprintf("%d", versionNo))
		}
		return nil, err
	}
	return r.GetVersionByID(id)
}

func (r *RecipeRepo) getUnit(ctx context.Context, q DBQuerier, unitID uuid.UUID) (*masterdata.Unit, error) {
	query := `SELECT id, code, symbol, dimension, base_unit_id, factor_to_base, name_th, name_en, sort_order, is_active, version, created_at, updated_at FROM units WHERE id = $1`
	var u masterdata.Unit
	err := q.QueryRow(ctx, query, unitID).Scan(
		&u.ID, &u.Code, &u.Symbol, &u.Dimension, &u.BaseUnitID, &u.FactorToBase,
		&u.NameTh, &u.NameEn, &u.SortOrder, &u.IsActive, &u.Version, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *RecipeRepo) getIngredients(ctx context.Context, q DBQuerier, versionID uuid.UUID) ([]recipe.Ingredient, error) {
	query := `
		SELECT ri.id, ri.version_id, ri.line_no, ri.ingredient_id, ri.quantity, ri.unit_id, ri.preparation_note, ri.is_optional,
		       i.id, i.code, i.name_th, i.name_en,
		       u.id, u.code, u.symbol, u.name_th, u.name_en
		FROM recipe_ingredients ri
		JOIN ingredients i ON i.id = ri.ingredient_id
		JOIN units u ON u.id = ri.unit_id
		WHERE ri.version_id = $1
		ORDER BY ri.line_no ASC
	`
	rows, err := q.Query(ctx, query, versionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ingrs []recipe.Ingredient
	for rows.Next() {
		var ing recipe.Ingredient
		var i masterdata.Ingredient
		var u masterdata.Unit
		if err := rows.Scan(
			&ing.ID, &ing.VersionID, &ing.LineNo, &ing.IngredientID, &ing.Quantity, &ing.UnitID, &ing.PreparationNote, &ing.IsOptional,
			&i.ID, &i.Code, &i.NameTh, &i.NameEn,
			&u.ID, &u.Code, &u.Symbol, &u.NameTh, &u.NameEn,
		); err != nil {
			return nil, err
		}
		ing.Ingredient = &i
		ing.Unit = &u
		ingrs = append(ingrs, ing)
	}
	return ingrs, nil
}

func (r *RecipeRepo) getSteps(ctx context.Context, q DBQuerier, versionID uuid.UUID) ([]recipe.Step, error) {
	query := `
		SELECT ps.id, ps.version_id, ps.step_no, ps.round_no, ps.step_type_id, ps.title, ps.instruction,
		       ps.temperature_c, ps.duration_minutes, ps.orientation_id, ps.params, ps.notes,
		       st.id, st.code, st.name_th, st.name_en, st.icon, st.uses_temperature, st.uses_duration, st.uses_orientation, st.is_repeatable,
		       l.id, l.code, l.name_th, l.name_en
		FROM process_steps ps
		JOIN process_step_types st ON st.id = ps.step_type_id
		LEFT JOIN lookups l ON l.id = ps.orientation_id
		WHERE ps.version_id = $1
		ORDER BY ps.step_no ASC
	`
	rows, err := q.Query(ctx, query, versionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var steps []recipe.Step
	for rows.Next() {
		var s recipe.Step
		var st masterdata.ProcessStepType
		var lID *uuid.UUID
		var lCode, lNameTh, lNameEn *string
		var paramsBytes []byte

		if err := rows.Scan(
			&s.ID, &s.VersionID, &s.StepNo, &s.RoundNo, &s.StepTypeID, &s.Title, &s.Instruction,
			&s.TemperatureC, &s.DurationMinutes, &s.OrientationID, &paramsBytes, &s.Notes,
			&st.ID, &st.Code, &st.NameTh, &st.NameEn, &st.Icon, &st.UsesTemperature, &st.UsesDuration, &st.UsesOrientation, &st.IsRepeatable,
			&lID, &lCode, &lNameTh, &lNameEn,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(paramsBytes, &s.Params)
		s.StepType = &st
		if lID != nil && lCode != nil {
			s.Orientation = &masterdata.Lookup{
				ID:     *lID,
				Code:   *lCode,
				NameTh: *lNameTh,
				NameEn: *lNameEn,
			}
		}
		steps = append(steps, s)
	}
	return steps, nil
}
