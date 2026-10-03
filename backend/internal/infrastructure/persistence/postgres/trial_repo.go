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
	"github.com/mookrob/backend/internal/domain/trial"
	"github.com/mookrob/backend/pkg/apperror"
)

type TrialRepo struct {
	pool *pgxpool.Pool
}

func NewTrialRepo(pool *pgxpool.Pool) *TrialRepo {
	return &TrialRepo{pool: pool}
}

func (r *TrialRepo) NextTrialNo(recipeID uuid.UUID) (int, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	var nextNo int
	err := q.QueryRow(ctx, `SELECT COALESCE(MAX(trial_no), 0) + 1 FROM trials WHERE recipe_id = $1`, recipeID).Scan(&nextNo)
	if err != nil {
		return 1, err
	}
	return nextNo, nil
}

func (r *TrialRepo) List(recipeID *uuid.UUID, outcome string, dateFrom, dateTo *string, search string, limit, offset int) ([]trial.Trial, int, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	whereClause := "WHERE t.deleted_at IS NULL"
	var args []any
	argIdx := 1

	if recipeID != nil {
		whereClause += fmt.Sprintf(" AND t.recipe_id = $%d", argIdx)
		args = append(args, *recipeID)
		argIdx++
	}

	if outcome != "" {
		whereClause += fmt.Sprintf(" AND t.outcome = $%d", argIdx)
		args = append(args, outcome)
		argIdx++
	}

	if dateFrom != nil && *dateFrom != "" {
		whereClause += fmt.Sprintf(" AND t.trial_date >= $%d", argIdx)
		args = append(args, *dateFrom)
		argIdx++
	}

	if dateTo != nil && *dateTo != "" {
		whereClause += fmt.Sprintf(" AND t.trial_date <= $%d", argIdx)
		args = append(args, *dateTo)
		argIdx++
	}

	if search != "" {
		whereClause += fmt.Sprintf(" AND (t.title ILIKE $%d OR t.summary ILIKE $%d OR r.name ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM trials t
		JOIN recipes r ON r.id = t.recipe_id
		%s
	`, whereClause)
	var total int
	if err := q.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT t.id, t.recipe_id, t.recipe_version_id, t.trial_no, TO_CHAR(t.trial_date, 'YYYY-MM-DD'),
		       t.title, t.outcome, t.overall_score, t.created_by, t.version, t.created_at, t.updated_at,
		       r.id, r.code, r.name,
		       COALESCE(rv.version_no, 1),
		       (SELECT COUNT(*) FROM trial_evaluations te WHERE te.trial_id = t.id) as evaluation_count,
		       (SELECT COUNT(*) FROM attachments a WHERE a.owner_type = 'TRIAL' AND a.owner_id = t.id) as photo_count
		FROM trials t
		JOIN recipes r ON r.id = t.recipe_id
		LEFT JOIN recipe_versions rv ON rv.id = t.recipe_version_id
		%s
		ORDER BY t.trial_date DESC, t.trial_no DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := q.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []trial.Trial
	for rows.Next() {
		var tr trial.Trial
		var rec recipe.Recipe
		var score *float64

		if err := rows.Scan(
			&tr.ID, &tr.RecipeID, &tr.RecipeVersionID, &tr.TrialNo, &tr.TrialDate,
			&tr.Title, &tr.Outcome, &score, &tr.CreatedBy, &tr.Version, &tr.CreatedAt, &tr.UpdatedAt,
			&rec.ID, &rec.Code, &rec.Name,
			&tr.RecipeVersionNo,
			&tr.EvaluationCount, &tr.PhotoCount,
		); err != nil {
			return nil, 0, err
		}
		tr.Recipe = &rec
		tr.OverallScore = score
		list = append(list, tr)
	}

	return list, total, nil
}

func (r *TrialRepo) GetByID(id uuid.UUID) (*trial.Trial, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT t.id, t.recipe_id, t.recipe_version_id, t.trial_no, TO_CHAR(t.trial_date, 'YYYY-MM-DD'),
		       t.title, t.outcome, t.input_quantity, t.input_unit_id, t.output_quantity, t.output_unit_id,
		       t.actual_yield_pct, t.ambient_temp_c, t.humidity_pct, t.weather_id,
		       t.summary, t.issues, t.next_actions, t.overall_score,
		       t.created_by, t.version, t.created_at, t.updated_at,
		       r.id, r.code, r.name,
		       COALESCE(rv.version_no, 1),
		       (SELECT COUNT(*) FROM trial_evaluations te WHERE te.trial_id = t.id) as evaluation_count,
		       (SELECT COUNT(*) FROM attachments a WHERE a.owner_type = 'TRIAL' AND a.owner_id = t.id) as photo_count
		FROM trials t
		JOIN recipes r ON r.id = t.recipe_id
		LEFT JOIN recipe_versions rv ON rv.id = t.recipe_version_id
		WHERE t.id = $1 AND t.deleted_at IS NULL
	`
	var tr trial.Trial
	var rec recipe.Recipe

	err := q.QueryRow(ctx, query, id).Scan(
		&tr.ID, &tr.RecipeID, &tr.RecipeVersionID, &tr.TrialNo, &tr.TrialDate,
		&tr.Title, &tr.Outcome, &tr.InputQuantity, &tr.InputUnitID, &tr.OutputQuantity, &tr.OutputUnitID,
		&tr.ActualYieldPct, &tr.AmbientTempC, &tr.HumidityPct, &tr.WeatherID,
		&tr.Summary, &tr.Issues, &tr.NextActions, &tr.OverallScore,
		&tr.CreatedBy, &tr.Version, &tr.CreatedAt, &tr.UpdatedAt,
		&rec.ID, &rec.Code, &rec.Name,
		&tr.RecipeVersionNo,
		&tr.EvaluationCount, &tr.PhotoCount,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("trial", id.String())
		}
		return nil, err
	}
	tr.Recipe = &rec

	// Units
	if tr.InputUnitID != nil {
		tr.InputUnit = r.getUnit(ctx, q, *tr.InputUnitID)
	}
	if tr.OutputUnitID != nil {
		tr.OutputUnit = r.getUnit(ctx, q, *tr.OutputUnitID)
	}
	if tr.WeatherID != nil {
		tr.Weather = r.getLookup(ctx, q, *tr.WeatherID)
	}

	// Ingredients & Steps
	tr.Ingredients, _ = r.getTrialIngredients(ctx, q, tr.ID)
	tr.Steps, _ = r.getTrialSteps(ctx, q, tr.ID)

	// Evaluations
	tr.Evaluations, _ = r.ListEvaluations(tr.ID)

	return &tr, nil
}

func (r *TrialRepo) Create(t *trial.Trial, ingrs []recipe.Ingredient, steps []recipe.Step) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		INSERT INTO trials (
			id, recipe_id, recipe_version_id, trial_no, trial_date, title, outcome,
			input_quantity, input_unit_id, output_quantity, output_unit_id, actual_yield_pct,
			ambient_temp_c, humidity_pct, weather_id, summary, issues, next_actions,
			overall_score, created_by, version, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5::DATE, $6, $7,
			$8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17, $18,
			$19, $20, $21, $22, $23
		)
	`
	_, err := q.Exec(ctx, query,
		t.ID, t.RecipeID, t.RecipeVersionID, t.TrialNo, t.TrialDate, t.Title, t.Outcome,
		t.InputQuantity, t.InputUnitID, t.OutputQuantity, t.OutputUnitID, t.ActualYieldPct,
		t.AmbientTempC, t.HumidityPct, t.WeatherID, t.Summary, t.Issues, t.NextActions,
		t.OverallScore, t.CreatedBy, t.Version, t.CreatedAt, t.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert trial: %w", err)
	}

	// Insert Trial Ingredients
	for _, ing := range ingrs {
		_, err := q.Exec(ctx, `
			INSERT INTO trial_ingredients (id, trial_id, line_no, ingredient_id, quantity, unit_id, preparation_note, is_optional)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, ing.ID, t.ID, ing.LineNo, ing.IngredientID, ing.Quantity, ing.UnitID, ing.PreparationNote, ing.IsOptional)
		if err != nil {
			return err
		}
	}

	// Insert Trial Steps
	for _, step := range steps {
		paramsBytes, _ := json.Marshal(step.Params)
		_, err := q.Exec(ctx, `
			INSERT INTO trial_steps (
				id, trial_id, step_no, round_no, step_type_id, title, instruction,
				temperature_c, duration_minutes, orientation_id, params, notes
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		`, step.ID, t.ID, step.StepNo, step.RoundNo, step.StepTypeID, step.Title, step.Instruction,
			step.TemperatureC, step.DurationMinutes, step.OrientationID, paramsBytes, step.Notes)
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *TrialRepo) Update(t *trial.Trial, ingrs []recipe.Ingredient, steps []recipe.Step) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		UPDATE trials
		SET trial_date = $1::DATE, title = $2, input_quantity = $3, input_unit_id = $4,
		    output_quantity = $5, output_unit_id = $6, actual_yield_pct = $7,
		    ambient_temp_c = $8, humidity_pct = $9, weather_id = $10,
		    summary = $11, issues = $12, next_actions = $13,
		    version = version + 1, updated_at = NOW()
		WHERE id = $14 AND version = $15 AND deleted_at IS NULL
	`
	tag, err := q.Exec(ctx, query,
		t.TrialDate, t.Title, t.InputQuantity, t.InputUnitID,
		t.OutputQuantity, t.OutputUnitID, t.ActualYieldPct,
		t.AmbientTempC, t.HumidityPct, t.WeatherID,
		t.Summary, t.Issues, t.NextActions,
		t.ID, t.Version,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.VersionConflict("trial was modified concurrently or not found")
	}

	// Replace ingredients if provided
	if ingrs != nil {
		_, _ = q.Exec(ctx, `DELETE FROM trial_ingredients WHERE trial_id = $1`, t.ID)
		for _, ing := range ingrs {
			_, _ = q.Exec(ctx, `
				INSERT INTO trial_ingredients (id, trial_id, line_no, ingredient_id, quantity, unit_id, preparation_note, is_optional)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			`, ing.ID, t.ID, ing.LineNo, ing.IngredientID, ing.Quantity, ing.UnitID, ing.PreparationNote, ing.IsOptional)
		}
	}

	// Replace steps if provided
	if steps != nil {
		_, _ = q.Exec(ctx, `DELETE FROM trial_steps WHERE trial_id = $1`, t.ID)
		for _, step := range steps {
			paramsBytes, _ := json.Marshal(step.Params)
			_, _ = q.Exec(ctx, `
				INSERT INTO trial_steps (
					id, trial_id, step_no, round_no, step_type_id, title, instruction,
					temperature_c, duration_minutes, orientation_id, params, notes
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			`, step.ID, t.ID, step.StepNo, step.RoundNo, step.StepTypeID, step.Title, step.Instruction,
				step.TemperatureC, step.DurationMinutes, step.OrientationID, paramsBytes, step.Notes)
		}
	}

	return nil
}

func (r *TrialRepo) UpdateOutcome(id uuid.UUID, outcome trial.Outcome, version int) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		UPDATE trials
		SET outcome = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2 AND version = $3 AND deleted_at IS NULL
	`
	tag, err := q.Exec(ctx, query, outcome, id, version)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.VersionConflict("trial was modified concurrently or not found")
	}
	return nil
}

func (r *TrialRepo) Delete(id uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	tag, err := q.Exec(ctx, `UPDATE trials SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.NotFound("trial", id.String())
	}
	return nil
}

// ---- Evaluations ----

func (r *TrialRepo) AddEvaluation(e *trial.Evaluation) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		INSERT INTO trial_evaluations (id, trial_id, taster_name, overall_comment, average_score, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := q.Exec(ctx, query, e.ID, e.TrialID, e.TasterName, e.OverallComment, e.AverageScore, e.CreatedBy, e.CreatedAt)
	if err != nil {
		return err
	}

	for _, s := range e.Scores {
		_, err := q.Exec(ctx, `
			INSERT INTO trial_evaluation_scores (id, evaluation_id, taste_attribute_id, score, comment)
			VALUES ($1, $2, $3, $4, $5)
		`, s.ID, e.ID, s.TasteAttributeID, s.Score, s.Comment)
		if err != nil {
			return err
		}
	}

	return r.recalculateTrialOverallScore(ctx, q, e.TrialID)
}

func (r *TrialRepo) UpdateEvaluation(e *trial.Evaluation) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	_, err := q.Exec(ctx, `
		UPDATE trial_evaluations
		SET taster_name = $1, overall_comment = $2, average_score = $3
		WHERE id = $4 AND trial_id = $5
	`, e.TasterName, e.OverallComment, e.AverageScore, e.ID, e.TrialID)
	if err != nil {
		return err
	}

	_, _ = q.Exec(ctx, `DELETE FROM trial_evaluation_scores WHERE evaluation_id = $1`, e.ID)
	for _, s := range e.Scores {
		_, _ = q.Exec(ctx, `
			INSERT INTO trial_evaluation_scores (id, evaluation_id, taste_attribute_id, score, comment)
			VALUES ($1, $2, $3, $4, $5)
		`, s.ID, e.ID, s.TasteAttributeID, s.Score, s.Comment)
	}

	return r.recalculateTrialOverallScore(ctx, q, e.TrialID)
}

func (r *TrialRepo) DeleteEvaluation(trialID, evaluationID uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	_, err := q.Exec(ctx, `DELETE FROM trial_evaluations WHERE id = $1 AND trial_id = $2`, evaluationID, trialID)
	if err != nil {
		return err
	}
	return r.recalculateTrialOverallScore(ctx, q, trialID)
}

func (r *TrialRepo) recalculateTrialOverallScore(ctx context.Context, q DBQuerier, trialID uuid.UUID) error {
	query := `
		UPDATE trials
		SET overall_score = (
			SELECT ROUND(AVG(average_score)::numeric, 2)
			FROM trial_evaluations
			WHERE trial_id = $1
		), updated_at = NOW()
		WHERE id = $1
	`
	_, err := q.Exec(ctx, query, trialID)
	return err
}

func (r *TrialRepo) ListEvaluations(trialID uuid.UUID) ([]trial.Evaluation, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, trial_id, taster_name, overall_comment, average_score, created_by, created_at
		FROM trial_evaluations
		WHERE trial_id = $1
		ORDER BY created_at ASC
	`
	rows, err := q.Query(ctx, query, trialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var evals []trial.Evaluation
	for rows.Next() {
		var e trial.Evaluation
		if err := rows.Scan(&e.ID, &e.TrialID, &e.TasterName, &e.OverallComment, &e.AverageScore, &e.CreatedBy, &e.CreatedAt); err != nil {
			return nil, err
		}
		evals = append(evals, e)
	}

	for i := range evals {
		scores, _ := r.getEvaluationScores(ctx, q, evals[i].ID)
		evals[i].Scores = scores
	}

	return evals, nil
}

func (r *TrialRepo) getEvaluationScores(ctx context.Context, q DBQuerier, evalID uuid.UUID) ([]trial.EvaluationScore, error) {
	query := `
		SELECT tes.id, tes.evaluation_id, tes.taste_attribute_id, tes.score, tes.comment,
		       ta.id, ta.code, ta.name_th, ta.name_en, ta.min_score, ta.max_score, ta.color
		FROM trial_evaluation_scores tes
		JOIN taste_attributes ta ON ta.id = tes.taste_attribute_id
		WHERE tes.evaluation_id = $1
		ORDER BY ta.sort_order ASC, ta.code ASC
	`
	rows, err := q.Query(ctx, query, evalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scores []trial.EvaluationScore
	for rows.Next() {
		var s trial.EvaluationScore
		var ta masterdata.TasteAttribute
		if err := rows.Scan(
			&s.ID, &s.EvaluationID, &s.TasteAttributeID, &s.Score, &s.Comment,
			&ta.ID, &ta.Code, &ta.NameTh, &ta.NameEn, &ta.MinScore, &ta.MaxScore, &ta.Color,
		); err != nil {
			return nil, err
		}
		s.TasteAttribute = &ta
		scores = append(scores, s)
	}
	return scores, nil
}

func (r *TrialRepo) GetTrialsByIDs(ids []uuid.UUID) ([]trial.Trial, error) {
	var trials []trial.Trial
	for _, id := range ids {
		t, err := r.GetByID(id)
		if err == nil {
			trials = append(trials, *t)
		}
	}
	return trials, nil
}

func (r *TrialRepo) getTrialIngredients(ctx context.Context, q DBQuerier, trialID uuid.UUID) ([]recipe.Ingredient, error) {
	query := `
		SELECT ti.id, ti.line_no, ti.ingredient_id, ti.quantity, ti.unit_id, ti.preparation_note, ti.is_optional,
		       i.id, i.code, i.name_th, i.name_en,
		       u.id, u.code, u.symbol, u.name_th, u.name_en
		FROM trial_ingredients ti
		JOIN ingredients i ON i.id = ti.ingredient_id
		JOIN units u ON u.id = ti.unit_id
		WHERE ti.trial_id = $1
		ORDER BY ti.line_no ASC
	`
	rows, err := q.Query(ctx, query, trialID)
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
			&ing.ID, &ing.LineNo, &ing.IngredientID, &ing.Quantity, &ing.UnitID, &ing.PreparationNote, &ing.IsOptional,
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

func (r *TrialRepo) getTrialSteps(ctx context.Context, q DBQuerier, trialID uuid.UUID) ([]recipe.Step, error) {
	query := `
		SELECT ts.id, ts.step_no, ts.round_no, ts.step_type_id, ts.title, ts.instruction,
		       ts.temperature_c, ts.duration_minutes, ts.orientation_id, ts.params, ts.notes,
		       st.id, st.code, st.name_th, st.name_en, st.icon, st.uses_temperature, st.uses_duration, st.uses_orientation, st.is_repeatable,
		       l.id, l.code, l.name_th, l.name_en
		FROM trial_steps ts
		JOIN process_step_types st ON st.id = ts.step_type_id
		LEFT JOIN lookups l ON l.id = ts.orientation_id
		WHERE ts.trial_id = $1
		ORDER BY ts.step_no ASC
	`
	rows, err := q.Query(ctx, query, trialID)
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
			&s.ID, &s.StepNo, &s.RoundNo, &s.StepTypeID, &s.Title, &s.Instruction,
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

func (r *TrialRepo) getUnit(ctx context.Context, q DBQuerier, id uuid.UUID) *masterdata.Unit {
	var u masterdata.Unit
	err := q.QueryRow(ctx, `SELECT id, code, symbol, dimension, name_th, name_en FROM units WHERE id = $1`, id).Scan(
		&u.ID, &u.Code, &u.Symbol, &u.Dimension, &u.NameTh, &u.NameEn,
	)
	if err != nil {
		return nil
	}
	return &u
}

func (r *TrialRepo) getLookup(ctx context.Context, q DBQuerier, id uuid.UUID) *masterdata.Lookup {
	var l masterdata.Lookup
	err := q.QueryRow(ctx, `SELECT id, code, name_th, name_en FROM lookups WHERE id = $1`, id).Scan(
		&l.ID, &l.Code, &l.NameTh, &l.NameEn,
	)
	if err != nil {
		return nil
	}
	return &l
}
