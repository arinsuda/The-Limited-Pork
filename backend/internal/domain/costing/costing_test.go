package costing

import (
	"testing"

	"github.com/google/uuid"
)

func TestCostCalculation_Calculate(t *testing.T) {
	calc := &CostCalculation{
		ID:             uuid.New(),
		Name:           "Crispy Pork Standard Batch",
		RawWeightKG:    10.0,
		CookedWeightKG: 6.0,
		WastagePct:     3.0,
		PortionWeightG: 150.0,
		TargetFoodCostPct: 35.0,
		TargetMarginPct:   65.0,
		ActualPricePerPortion: 120.0,
		Ingredients: []IngredientCostItem{
			{
				IngredientName: "หมูสามชั้นเส้นสวย",
				Quantity:       10.0,
				UnitPrice:      160.0,
				TrimLossPct:    5.0, // 10 * 1.05 * 160 = 1680.00
			},
			{
				IngredientName: "เกลือสมุทร",
				Quantity:       0.1,
				UnitPrice:      20.0,
				TrimLossPct:    0.0, // 2.00
			},
			{
				IngredientName: "น้ำมันปาล์มสำหรับทอด",
				Quantity:       2.0,
				UnitPrice:      45.0,
				TrimLossPct:    0.0, // 90.00
			},
		},
		Operations: []OperationCostItem{
			{
				Name:      "แก๊สหุงต้ม LPG",
				Category:  "GAS",
				Rate:      25.0,
				Usage:     2.0, // 50.00
			},
			{
				Name:      "ค่าไฟเตาอบลมร้อน",
				Category:  "ELECTRICITY",
				Rate:      5.0,
				Usage:     4.0, // 20.00
			},
		},
		Packaging: []PackagingCostItem{
			{
				Name:      "กล่องกระดาษคราฟท์ + สติ๊กเกอร์",
				UnitPrice: 3.50,
				Quantity:  40.0, // 140.00
			},
		},
	}

	calc.Calculate()

	// 1. Ingredients total: 1680 + 2 + 90 = 1772.00
	expectedIngTotal := 1772.00
	if calc.IngredientsTotalCost != expectedIngTotal {
		t.Errorf("expected IngredientsTotalCost %.2f, got %.2f", expectedIngTotal, calc.IngredientsTotalCost)
	}

	// 2. Operations total: 50 + 20 = 70.00
	expectedOpsTotal := 70.00
	if calc.OperationsTotalCost != expectedOpsTotal {
		t.Errorf("expected OperationsTotalCost %.2f, got %.2f", expectedOpsTotal, calc.OperationsTotalCost)
	}

	// 3. Packaging total: 140.00
	expectedPkgTotal := 140.00
	if calc.PackagingTotalCost != expectedPkgTotal {
		t.Errorf("expected PackagingTotalCost %.2f, got %.2f", expectedPkgTotal, calc.PackagingTotalCost)
	}

	// 4. Yield: 6.0 / 10.0 * 100 = 60.0%
	if calc.YieldPct != 60.0 {
		t.Errorf("expected YieldPct 60.0, got %.2f", calc.YieldPct)
	}
	if calc.ShrinkagePct != 40.0 {
		t.Errorf("expected ShrinkagePct 40.0, got %.2f", calc.ShrinkagePct)
	}

	// 5. Wastage: (1772 + 70) * 0.03 = 55.26
	expectedWastage := 55.26
	if calc.WastageTotalCost != expectedWastage {
		t.Errorf("expected WastageTotalCost %.2f, got %.2f", expectedWastage, calc.WastageTotalCost)
	}

	// 6. Total Batch: 1772 + 70 + 140 + 55.26 = 2037.26
	expectedBatchCost := 2037.26
	if calc.TotalBatchCost != expectedBatchCost {
		t.Errorf("expected TotalBatchCost %.2f, got %.2f", expectedBatchCost, calc.TotalBatchCost)
	}

	// 7. Portions: (6.0 * 1000) / 150 = 40.0
	if calc.TotalPortions != 40.0 {
		t.Errorf("expected TotalPortions 40.0, got %.2f", calc.TotalPortions)
	}

	// 8. Cost per portion: 2037.26 / 40.0 = 50.93
	expectedCostPerPortion := 50.93
	if calc.CostPerPortion != expectedCostPerPortion {
		t.Errorf("expected CostPerPortion %.2f, got %.2f", expectedCostPerPortion, calc.CostPerPortion)
	}

	// 9. Profit & Margins at 120 THB:
	// Gross Profit: 120 - 50.93 = 69.07
	expectedGrossProfit := 69.07
	if calc.GrossProfitPerPortion != expectedGrossProfit {
		t.Errorf("expected GrossProfitPerPortion %.2f, got %.2f", expectedGrossProfit, calc.GrossProfitPerPortion)
	}

	// Margin %: 69.07 / 120 * 100 = 57.56%
	expectedMarginPct := 57.56
	if calc.GrossProfitMarginPct != expectedMarginPct {
		t.Errorf("expected GrossProfitMarginPct %.2f, got %.2f", expectedMarginPct, calc.GrossProfitMarginPct)
	}

	// Revenue: 40 * 120 = 4800.00
	if calc.TotalBatchRevenue != 4800.00 {
		t.Errorf("expected TotalBatchRevenue 4800.00, got %.2f", calc.TotalBatchRevenue)
	}

	// Total Gross Profit: 4800 - 2037.26 = 2762.74
	if calc.TotalBatchGrossProfit != 2762.74 {
		t.Errorf("expected TotalBatchGrossProfit 2762.74, got %.2f", calc.TotalBatchGrossProfit)
	}
}

func TestCostCalculation_Validate(t *testing.T) {
	c := &CostCalculation{}
	if err := c.Validate(); err != ErrInvalidName {
		t.Errorf("expected ErrInvalidName, got %v", err)
	}

	c.Name = "Test"
	if err := c.Validate(); err != ErrInvalidRawWeight {
		t.Errorf("expected ErrInvalidRawWeight, got %v", err)
	}

	c.RawWeightKG = 5.0
	if err := c.Validate(); err != ErrInvalidPortionWeight {
		t.Errorf("expected ErrInvalidPortionWeight, got %v", err)
	}

	c.PortionWeightG = 150.0
	if err := c.Validate(); nil != err {
		t.Errorf("expected nil error, got %v", err)
	}
}
