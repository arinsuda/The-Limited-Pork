package costing

import (
	"errors"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalidName          = errors.New("cost calculation name cannot be empty")
	ErrInvalidRawWeight     = errors.New("raw weight must be greater than zero")
	ErrInvalidPortionWeight = errors.New("portion weight must be greater than zero")
)

type IngredientCostItem struct {
	ID             string     `json:"id"`
	IngredientID   *uuid.UUID `json:"ingredientId,omitempty"`
	IngredientName string     `json:"ingredientName"`
	Quantity       float64    `json:"quantity"`
	UnitID         *uuid.UUID `json:"unitId,omitempty"`
	UnitName       string     `json:"unitName"`
	UnitPrice      float64    `json:"unitPrice"`
	TrimLossPct    float64    `json:"trimLossPct"`
	TotalCost      float64    `json:"totalCost"`
}

type OperationCostItem struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Category  string  `json:"category"` // "GAS", "ELECTRICITY", "LABOR", "OTHER"
	Rate      float64 `json:"rate"`
	Usage     float64 `json:"usage"`
	TotalCost float64 `json:"totalCost"`
}

type PackagingCostItem struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	UnitPrice float64 `json:"unitPrice"`
	Quantity  float64 `json:"quantity"`
	TotalCost float64 `json:"totalCost"`
}

type CostCalculation struct {
	ID              uuid.UUID  `json:"id"`
	Name            string     `json:"name"`
	RecipeID        *uuid.UUID `json:"recipeId,omitempty"`
	RecipeVersionID *uuid.UUID `json:"recipeVersionId,omitempty"`
	RecipeName      string     `json:"recipeName,omitempty"`
	Notes           *string    `json:"notes,omitempty"`

	// Raw & Cooking Yield Parameters
	RawWeightKG    float64 `json:"rawWeightKg"`
	CookedWeightKG float64 `json:"cookedWeightKg"`
	YieldPct       float64 `json:"yieldPct"`
	ShrinkagePct   float64 `json:"shrinkagePct"`
	WastagePct     float64 `json:"wastagePct"`

	// Itemized lists
	Ingredients []IngredientCostItem `json:"ingredients"`
	Operations  []OperationCostItem  `json:"operations"`
	Packaging   []PackagingCostItem  `json:"packaging"`

	// Calculated Cost Breakdown
	IngredientsTotalCost float64 `json:"ingredientsTotalCost"`
	OperationsTotalCost  float64 `json:"operationsTotalCost"`
	PackagingTotalCost   float64 `json:"packagingTotalCost"`
	WastageTotalCost     float64 `json:"wastageTotalCost"`
	TotalBatchCost       float64 `json:"totalBatchCost"`
	CostPerRawKG         float64 `json:"costPerRawKg"`
	CostPerCookedKG      float64 `json:"costPerCookedKg"`

	// Portioning & Pricing Analysis
	PortionWeightG             float64 `json:"portionWeightG"`
	TotalPortions              float64 `json:"totalPortions"`
	CostPerPortion             float64 `json:"costPerPortion"`
	TargetFoodCostPct          float64 `json:"targetFoodCostPct"`
	RecommendedPriceByFoodCost float64 `json:"recommendedPriceByFoodCost"`
	TargetMarginPct            float64 `json:"targetMarginPct"`
	RecommendedPriceByMargin   float64 `json:"recommendedPriceByMargin"`
	ActualPricePerPortion      float64 `json:"actualPricePerPortion"`
	GrossProfitPerPortion      float64 `json:"grossProfitPerPortion"`
	GrossProfitMarginPct       float64 `json:"grossProfitMarginPct"`
	ActualFoodCostPct          float64 `json:"actualFoodCostPct"`
	TotalBatchRevenue          float64 `json:"totalBatchRevenue"`
	TotalBatchGrossProfit      float64 `json:"totalBatchGrossProfit"`
	BreakEvenPortions          float64 `json:"breakEvenPortions"`

	CreatedBy uuid.UUID  `json:"createdBy"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func (c *CostCalculation) Validate() error {
	if strings.TrimSpace(c.Name) == "" {
		return ErrInvalidName
	}
	if c.RawWeightKG <= 0 {
		return ErrInvalidRawWeight
	}
	if c.PortionWeightG <= 0 {
		return ErrInvalidPortionWeight
	}
	return nil
}

func (c *CostCalculation) Calculate() {
	// 1. Ingredients Cost
	var ingTotal float64
	for i := range c.Ingredients {
		effQty := c.Ingredients[i].Quantity * (1.0 + (c.Ingredients[i].TrimLossPct / 100.0))
		c.Ingredients[i].TotalCost = round2(effQty * c.Ingredients[i].UnitPrice)
		ingTotal += c.Ingredients[i].TotalCost
	}
	c.IngredientsTotalCost = round2(ingTotal)

	// 2. Yield & Weights
	if c.RawWeightKG > 0 {
		if c.CookedWeightKG <= 0 && c.YieldPct > 0 {
			c.CookedWeightKG = round2(c.RawWeightKG * (c.YieldPct / 100.0))
		} else if c.CookedWeightKG > 0 {
			c.YieldPct = round2((c.CookedWeightKG / c.RawWeightKG) * 100.0)
		}
		c.ShrinkagePct = round2(100.0 - c.YieldPct)
		c.CostPerRawKG = round2(c.IngredientsTotalCost / c.RawWeightKG)
	}
	if c.CookedWeightKG > 0 {
		c.CostPerCookedKG = round2(c.IngredientsTotalCost / c.CookedWeightKG)
	}

	// 3. Operations Cost
	var opsTotal float64
	for i := range c.Operations {
		c.Operations[i].TotalCost = round2(c.Operations[i].Rate * c.Operations[i].Usage)
		opsTotal += c.Operations[i].TotalCost
	}
	c.OperationsTotalCost = round2(opsTotal)

	// 4. Packaging Cost
	var pkgTotal float64
	for i := range c.Packaging {
		c.Packaging[i].TotalCost = round2(c.Packaging[i].UnitPrice * c.Packaging[i].Quantity)
		pkgTotal += c.Packaging[i].TotalCost
	}
	c.PackagingTotalCost = round2(pkgTotal)

	// 5. Wastage & Total Batch Cost
	c.WastageTotalCost = round2((c.IngredientsTotalCost + c.OperationsTotalCost) * (c.WastagePct / 100.0))
	c.TotalBatchCost = round2(c.IngredientsTotalCost + c.OperationsTotalCost + c.PackagingTotalCost + c.WastageTotalCost)

	// 6. Portioning
	if c.PortionWeightG > 0 && c.CookedWeightKG > 0 {
		c.TotalPortions = round2((c.CookedWeightKG * 1000.0) / c.PortionWeightG)
	}
	if c.TotalPortions > 0 {
		c.CostPerPortion = round2(c.TotalBatchCost / c.TotalPortions)
	}

	// 7. Pricing Recommendations
	if c.TargetFoodCostPct > 0 && c.CostPerPortion > 0 {
		c.RecommendedPriceByFoodCost = round2(c.CostPerPortion / (c.TargetFoodCostPct / 100.0))
	}
	if c.TargetMarginPct > 0 && c.TargetMarginPct < 100.0 && c.CostPerPortion > 0 {
		c.RecommendedPriceByMargin = round2(c.CostPerPortion / (1.0 - (c.TargetMarginPct / 100.0)))
	}

	// 8. Actual Price & Margins
	if c.ActualPricePerPortion > 0 {
		c.GrossProfitPerPortion = round2(c.ActualPricePerPortion - c.CostPerPortion)
		c.GrossProfitMarginPct = round2((c.GrossProfitPerPortion / c.ActualPricePerPortion) * 100.0)
		c.ActualFoodCostPct = round2((c.CostPerPortion / c.ActualPricePerPortion) * 100.0)
		c.TotalBatchRevenue = round2(c.TotalPortions * c.ActualPricePerPortion)
		c.TotalBatchGrossProfit = round2(c.TotalBatchRevenue - c.TotalBatchCost)
		c.BreakEvenPortions = round2(c.TotalBatchCost / c.ActualPricePerPortion)
	}
}
