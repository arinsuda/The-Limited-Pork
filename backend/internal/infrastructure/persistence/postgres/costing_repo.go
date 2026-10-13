package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mookrob/backend/internal/domain/costing"
	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type CostingRepo struct {
	pool *pgxpool.Pool
}

func NewCostingRepo(pool *pgxpool.Pool) *CostingRepo {
	return &CostingRepo{pool: pool}
}

func (r *CostingRepo) Create(ctx context.Context, c *costing.CostCalculation) error {
	q := GetQuerier(ctx, r.pool)

	ingJSON, err := json.Marshal(c.Ingredients)
	if err != nil {
		return fmt.Errorf("failed to marshal ingredients: %w", err)
	}
	opsJSON, err := json.Marshal(c.Operations)
	if err != nil {
		return fmt.Errorf("failed to marshal operations: %w", err)
	}
	pkgJSON, err := json.Marshal(c.Packaging)
	if err != nil {
		return fmt.Errorf("failed to marshal packaging: %w", err)
	}
	saucesJSON, err := json.Marshal(c.Sauces)
	if err != nil {
		return fmt.Errorf("failed to marshal sauces: %w", err)
	}

	query := `
		INSERT INTO cost_calculations (
			id, name, recipe_id, recipe_version_id, notes,
			raw_weight_kg, cooked_weight_kg, yield_pct, shrinkage_pct, wastage_pct,
			ingredients_total_cost, operations_total_cost, packaging_total_cost, sauces_total_cost, wastage_total_cost,
			total_batch_cost, cost_per_raw_kg, cost_per_cooked_kg,
			portion_weight_g, total_portions, cost_per_portion,
			target_food_cost_pct, recommended_price_by_food_cost,
			target_margin_pct, recommended_price_by_margin,
			actual_price_per_portion, gross_profit_per_portion, gross_profit_margin_pct, actual_food_cost_pct,
			total_batch_revenue, total_batch_gross_profit, break_even_portions,
			ingredients_data, operations_data, packaging_data, sauces_data,
			created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15,
			$16, $17, $18,
			$19, $20, $21,
			$22, $23,
			$24, $25,
			$26, $27, $28, $29,
			$30, $31, $32,
			$33, $34, $35, $36,
			$37, $38, $39
		)
	`

	_, err = q.Exec(ctx, query,
		c.ID, c.Name, c.RecipeID, c.RecipeVersionID, c.Notes,
		c.RawWeightKG, c.CookedWeightKG, c.YieldPct, c.ShrinkagePct, c.WastagePct,
		c.IngredientsTotalCost, c.OperationsTotalCost, c.PackagingTotalCost, c.SaucesTotalCost, c.WastageTotalCost,
		c.TotalBatchCost, c.CostPerRawKG, c.CostPerCookedKG,
		c.PortionWeightG, c.TotalPortions, c.CostPerPortion,
		c.TargetFoodCostPct, c.RecommendedPriceByFoodCost,
		c.TargetMarginPct, c.RecommendedPriceByMargin,
		c.ActualPricePerPortion, c.GrossProfitPerPortion, c.GrossProfitMarginPct, c.ActualFoodCostPct,
		c.TotalBatchRevenue, c.TotalBatchGrossProfit, c.BreakEvenPortions,
		ingJSON, opsJSON, pkgJSON, saucesJSON,
		c.CreatedBy, c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert cost calculation: %w", err)
	}

	return nil
}

func (r *CostingRepo) GetByID(ctx context.Context, id uuid.UUID) (*costing.CostCalculation, error) {
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT 
			c.id, c.name, c.recipe_id, c.recipe_version_id, c.notes,
			c.raw_weight_kg, c.cooked_weight_kg, c.yield_pct, c.shrinkage_pct, c.wastage_pct,
			c.ingredients_total_cost, c.operations_total_cost, c.packaging_total_cost, c.sauces_total_cost, c.wastage_total_cost,
			c.total_batch_cost, c.cost_per_raw_kg, c.cost_per_cooked_kg,
			c.portion_weight_g, c.total_portions, c.cost_per_portion,
			c.target_food_cost_pct, c.recommended_price_by_food_cost,
			c.target_margin_pct, c.recommended_price_by_margin,
			c.actual_price_per_portion, c.gross_profit_per_portion, c.gross_profit_margin_pct, c.actual_food_cost_pct,
			c.total_batch_revenue, c.total_batch_gross_profit, c.break_even_portions,
			c.ingredients_data, c.operations_data, c.packaging_data, c.sauces_data,
			c.created_by, c.created_at, c.updated_at,
			COALESCE(rec.name, '') as recipe_name
		FROM cost_calculations c
		LEFT JOIN recipes rec ON c.recipe_id = rec.id
		WHERE c.id = $1 AND c.deleted_at IS NULL
	`

	var c costing.CostCalculation
	var ingJSON, opsJSON, pkgJSON, saucesJSON []byte

	err := q.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.Name, &c.RecipeID, &c.RecipeVersionID, &c.Notes,
		&c.RawWeightKG, &c.CookedWeightKG, &c.YieldPct, &c.ShrinkagePct, &c.WastagePct,
		&c.IngredientsTotalCost, &c.OperationsTotalCost, &c.PackagingTotalCost, &c.SaucesTotalCost, &c.WastageTotalCost,
		&c.TotalBatchCost, &c.CostPerRawKG, &c.CostPerCookedKG,
		&c.PortionWeightG, &c.TotalPortions, &c.CostPerPortion,
		&c.TargetFoodCostPct, &c.RecommendedPriceByFoodCost,
		&c.TargetMarginPct, &c.RecommendedPriceByMargin,
		&c.ActualPricePerPortion, &c.GrossProfitPerPortion, &c.GrossProfitMarginPct, &c.ActualFoodCostPct,
		&c.TotalBatchRevenue, &c.TotalBatchGrossProfit, &c.BreakEvenPortions,
		&ingJSON, &opsJSON, &pkgJSON, &saucesJSON,
		&c.CreatedBy, &c.CreatedAt, &c.UpdatedAt,
		&c.RecipeName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.NotFound("cost_calculation", id.String())
		}
		return nil, fmt.Errorf("failed to query cost calculation: %w", err)
	}

	_ = json.Unmarshal(ingJSON, &c.Ingredients)
	_ = json.Unmarshal(opsJSON, &c.Operations)
	_ = json.Unmarshal(pkgJSON, &c.Packaging)
	_ = json.Unmarshal(saucesJSON, &c.Sauces)

	return &c, nil
}

func (r *CostingRepo) Update(ctx context.Context, c *costing.CostCalculation) error {
	q := GetQuerier(ctx, r.pool)

	ingJSON, err := json.Marshal(c.Ingredients)
	if err != nil {
		return fmt.Errorf("failed to marshal ingredients: %w", err)
	}
	opsJSON, err := json.Marshal(c.Operations)
	if err != nil {
		return fmt.Errorf("failed to marshal operations: %w", err)
	}
	pkgJSON, err := json.Marshal(c.Packaging)
	if err != nil {
		return fmt.Errorf("failed to marshal packaging: %w", err)
	}
	saucesJSON, err := json.Marshal(c.Sauces)
	if err != nil {
		return fmt.Errorf("failed to marshal sauces: %w", err)
	}

	query := `
		UPDATE cost_calculations SET
			name = $2, recipe_id = $3, recipe_version_id = $4, notes = $5,
			raw_weight_kg = $6, cooked_weight_kg = $7, yield_pct = $8, shrinkage_pct = $9, wastage_pct = $10,
			ingredients_total_cost = $11, operations_total_cost = $12, packaging_total_cost = $13, sauces_total_cost = $14, wastage_total_cost = $15,
			total_batch_cost = $16, cost_per_raw_kg = $17, cost_per_cooked_kg = $18,
			portion_weight_g = $19, total_portions = $20, cost_per_portion = $21,
			target_food_cost_pct = $22, recommended_price_by_food_cost = $23,
			target_margin_pct = $24, recommended_price_by_margin = $25,
			actual_price_per_portion = $26, gross_profit_per_portion = $27, gross_profit_margin_pct = $28, actual_food_cost_pct = $29,
			total_batch_revenue = $30, total_batch_gross_profit = $31, break_even_portions = $32,
			ingredients_data = $33, operations_data = $34, packaging_data = $35, sauces_data = $36,
			updated_at = $37
		WHERE id = $1 AND deleted_at IS NULL
	`

	res, err := q.Exec(ctx, query,
		c.ID, c.Name, c.RecipeID, c.RecipeVersionID, c.Notes,
		c.RawWeightKG, c.CookedWeightKG, c.YieldPct, c.ShrinkagePct, c.WastagePct,
		c.IngredientsTotalCost, c.OperationsTotalCost, c.PackagingTotalCost, c.SaucesTotalCost, c.WastageTotalCost,
		c.TotalBatchCost, c.CostPerRawKG, c.CostPerCookedKG,
		c.PortionWeightG, c.TotalPortions, c.CostPerPortion,
		c.TargetFoodCostPct, c.RecommendedPriceByFoodCost,
		c.TargetMarginPct, c.RecommendedPriceByMargin,
		c.ActualPricePerPortion, c.GrossProfitPerPortion, c.GrossProfitMarginPct, c.ActualFoodCostPct,
		c.TotalBatchRevenue, c.TotalBatchGrossProfit, c.BreakEvenPortions,
		ingJSON, opsJSON, pkgJSON, saucesJSON,
		time.Now(),
	)
	if err != nil {
		return fmt.Errorf("failed to update cost calculation: %w", err)
	}
	if res.RowsAffected() == 0 {
		return apperror.NotFound("cost_calculation", c.ID.String())
	}

	return nil
}

func (r *CostingRepo) Delete(ctx context.Context, id uuid.UUID) error {
	q := GetQuerier(ctx, r.pool)

	query := `UPDATE cost_calculations SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	res, err := q.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to soft-delete cost calculation: %w", err)
	}
	if res.RowsAffected() == 0 {
		return apperror.NotFound("cost_calculation", id.String())
	}

	return nil
}

func (r *CostingRepo) List(ctx context.Context, filter costing.ListFilter, page pagination.Params) (*pagination.Paged[costing.CostCalculation], error) {
	q := GetQuerier(ctx, r.pool)

	whereClause := "WHERE c.deleted_at IS NULL"
	var args []any
	argIdx := 1

	if filter.Search != "" {
		whereClause += fmt.Sprintf(" AND (c.name ILIKE $%d OR COALESCE(rec.name, '') ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}

	if filter.RecipeID != nil {
		whereClause += fmt.Sprintf(" AND c.recipe_id = $%d", argIdx)
		args = append(args, *filter.RecipeID)
		argIdx++
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM cost_calculations c 
		LEFT JOIN recipes rec ON c.recipe_id = rec.id 
		%s
	`, whereClause)

	var total int
	err := q.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count cost calculations: %w", err)
	}

	dataQuery := fmt.Sprintf(`
		SELECT 
			c.id, c.name, c.recipe_id, c.recipe_version_id, c.notes,
			c.raw_weight_kg, c.cooked_weight_kg, c.yield_pct, c.shrinkage_pct, c.wastage_pct,
			c.ingredients_total_cost, c.operations_total_cost, c.packaging_total_cost, c.sauces_total_cost, c.wastage_total_cost,
			c.total_batch_cost, c.cost_per_raw_kg, c.cost_per_cooked_kg,
			c.portion_weight_g, c.total_portions, c.cost_per_portion,
			c.target_food_cost_pct, c.recommended_price_by_food_cost,
			c.target_margin_pct, c.recommended_price_by_margin,
			c.actual_price_per_portion, c.gross_profit_per_portion, c.gross_profit_margin_pct, c.actual_food_cost_pct,
			c.total_batch_revenue, c.total_batch_gross_profit, c.break_even_portions,
			c.ingredients_data, c.operations_data, c.packaging_data, c.sauces_data,
			c.created_by, c.created_at, c.updated_at,
			COALESCE(rec.name, '') as recipe_name
		FROM cost_calculations c
		LEFT JOIN recipes rec ON c.recipe_id = rec.id
		%s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, page.Limit(), page.Offset())

	rows, err := q.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query cost calculations: %w", err)
	}
	defer rows.Close()

	items := make([]costing.CostCalculation, 0)
	for rows.Next() {
		var c costing.CostCalculation
		var ingJSON, opsJSON, pkgJSON, saucesJSON []byte

		err := rows.Scan(
			&c.ID, &c.Name, &c.RecipeID, &c.RecipeVersionID, &c.Notes,
			&c.RawWeightKG, &c.CookedWeightKG, &c.YieldPct, &c.ShrinkagePct, &c.WastagePct,
			&c.IngredientsTotalCost, &c.OperationsTotalCost, &c.PackagingTotalCost, &c.SaucesTotalCost, &c.WastageTotalCost,
			&c.TotalBatchCost, &c.CostPerRawKG, &c.CostPerCookedKG,
			&c.PortionWeightG, &c.TotalPortions, &c.CostPerPortion,
			&c.TargetFoodCostPct, &c.RecommendedPriceByFoodCost,
			&c.TargetMarginPct, &c.RecommendedPriceByMargin,
			&c.ActualPricePerPortion, &c.GrossProfitPerPortion, &c.GrossProfitMarginPct, &c.ActualFoodCostPct,
			&c.TotalBatchRevenue, &c.TotalBatchGrossProfit, &c.BreakEvenPortions,
			&ingJSON, &opsJSON, &pkgJSON, &saucesJSON,
			&c.CreatedBy, &c.CreatedAt, &c.UpdatedAt,
			&c.RecipeName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan cost calculation: %w", err)
		}

		_ = json.Unmarshal(ingJSON, &c.Ingredients)
		_ = json.Unmarshal(opsJSON, &c.Operations)
		_ = json.Unmarshal(pkgJSON, &c.Packaging)
		_ = json.Unmarshal(saucesJSON, &c.Sauces)

		items = append(items, c)
	}

	totalPages := 1
	if page.PageSize > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(page.PageSize)))
	}

	return &pagination.Paged[costing.CostCalculation]{
		Data: items,
		Meta: pagination.Meta{
			Page:       page.Page,
			PageSize:   page.PageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}
