package application

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/domain/costing"
	"github.com/mookrob/backend/internal/infrastructure/persistence/postgres"
	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type CostingInput struct {
	Name            string                       `json:"name"`
	RecipeID        *uuid.UUID                   `json:"recipeId,omitempty"`
	RecipeVersionID *uuid.UUID                   `json:"recipeVersionId,omitempty"`
	Notes           *string                      `json:"notes,omitempty"`
	RawWeightKG     float64                      `json:"rawWeightKg"`
	CookedWeightKG  float64                      `json:"cookedWeightKg"`
	YieldPct        float64                      `json:"yieldPct"`
	WastagePct      float64                      `json:"wastagePct"`
	Ingredients     []costing.IngredientCostItem `json:"ingredients"`
	Operations      []costing.OperationCostItem  `json:"operations"`
	Packaging       []costing.PackagingCostItem  `json:"packaging"`
	PortionWeightG  float64                      `json:"portionWeightG"`
	TargetFoodCostPct float64                    `json:"targetFoodCostPct"`
	TargetMarginPct   float64                    `json:"targetMarginPct"`
	ActualPricePerPortion float64                `json:"actualPricePerPortion"`
}

type CostingService struct {
	costRepo   costing.Repository
	recipeRepo *postgres.RecipeRepo
	mdRepo     *postgres.MasterDataRepo
	clock      ports.Clock
	idGen      ports.IDGen
}

func NewCostingService(
	costRepo costing.Repository,
	recipeRepo *postgres.RecipeRepo,
	mdRepo *postgres.MasterDataRepo,
	clock ports.Clock,
	idGen ports.IDGen,
) *CostingService {
	return &CostingService{
		costRepo:   costRepo,
		recipeRepo: recipeRepo,
		mdRepo:     mdRepo,
		clock:      clock,
		idGen:      idGen,
	}
}

func (s *CostingService) buildEntity(req CostingInput) *costing.CostCalculation {
	calc := &costing.CostCalculation{
		Name:                  strings.TrimSpace(req.Name),
		RecipeID:              req.RecipeID,
		RecipeVersionID:       req.RecipeVersionID,
		Notes:                 req.Notes,
		RawWeightKG:           req.RawWeightKG,
		CookedWeightKG:        req.CookedWeightKG,
		YieldPct:              req.YieldPct,
		WastagePct:            req.WastagePct,
		Ingredients:           req.Ingredients,
		Operations:            req.Operations,
		Packaging:             req.Packaging,
		PortionWeightG:        req.PortionWeightG,
		TargetFoodCostPct:     req.TargetFoodCostPct,
		TargetMarginPct:       req.TargetMarginPct,
		ActualPricePerPortion: req.ActualPricePerPortion,
	}

	if calc.Ingredients == nil {
		calc.Ingredients = []costing.IngredientCostItem{}
	}
	if calc.Operations == nil {
		calc.Operations = []costing.OperationCostItem{}
	}
	if calc.Packaging == nil {
		calc.Packaging = []costing.PackagingCostItem{}
	}

	// Ensure sub-items have IDs
	for i := range calc.Ingredients {
		if calc.Ingredients[i].ID == "" {
			calc.Ingredients[i].ID = s.idGen.NewUUID().String()
		}
	}
	for i := range calc.Operations {
		if calc.Operations[i].ID == "" {
			calc.Operations[i].ID = s.idGen.NewUUID().String()
		}
	}
	for i := range calc.Packaging {
		if calc.Packaging[i].ID == "" {
			calc.Packaging[i].ID = s.idGen.NewUUID().String()
		}
	}

	calc.Calculate()
	return calc
}

func (s *CostingService) Simulate(req CostingInput) *costing.CostCalculation {
	calc := s.buildEntity(req)
	calc.ID = s.idGen.NewUUID()
	calc.CreatedAt = s.clock.Now()
	calc.UpdatedAt = s.clock.Now()
	return calc
}

func (s *CostingService) Create(ctx context.Context, userID uuid.UUID, req CostingInput) (*costing.CostCalculation, error) {
	calc := s.buildEntity(req)
	if err := calc.Validate(); err != nil {
		return nil, apperror.Validation(err.Error())
	}

	calc.ID = s.idGen.NewUUID()
	calc.CreatedBy = userID
	calc.CreatedAt = s.clock.Now()
	calc.UpdatedAt = s.clock.Now()

	if err := s.costRepo.Create(ctx, calc); err != nil {
		return nil, err
	}

	return calc, nil
}

func (s *CostingService) GetByID(ctx context.Context, id uuid.UUID) (*costing.CostCalculation, error) {
	return s.costRepo.GetByID(ctx, id)
}

func (s *CostingService) Update(ctx context.Context, id uuid.UUID, req CostingInput) (*costing.CostCalculation, error) {
	existing, err := s.costRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	calc := s.buildEntity(req)
	if err := calc.Validate(); err != nil {
		return nil, apperror.Validation(err.Error())
	}

	calc.ID = existing.ID
	calc.CreatedBy = existing.CreatedBy
	calc.CreatedAt = existing.CreatedAt
	calc.UpdatedAt = s.clock.Now()

	if err := s.costRepo.Update(ctx, calc); err != nil {
		return nil, err
	}

	return calc, nil
}

func (s *CostingService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.costRepo.Delete(ctx, id)
}

func (s *CostingService) List(ctx context.Context, filter costing.ListFilter, page pagination.Params) (*pagination.Paged[costing.CostCalculation], error) {
	return s.costRepo.List(ctx, filter, page)
}

func (s *CostingService) GetRecipeTemplate(ctx context.Context, recipeID uuid.UUID) (*costing.CostCalculation, error) {
	rec, err := s.recipeRepo.GetByID(recipeID)
	if err != nil {
		return nil, err
	}
	if rec.CurrentVersionID == nil {
		return nil, apperror.Validation("recipe has no current version")
	}

	ver, err := s.recipeRepo.GetVersionByID(*rec.CurrentVersionID)
	if err != nil {
		return nil, err
	}

	rawWeight := 10.0
	if ver.InputQuantity != nil && *ver.InputQuantity > 0 {
		rawWeight = *ver.InputQuantity
	}

	cookedWeight := 6.0
	if ver.ExpectedOutputQuantity != nil && *ver.ExpectedOutputQuantity > 0 {
		cookedWeight = *ver.ExpectedOutputQuantity
	}

	yieldPct := 60.0
	if ver.ExpectedYieldPct != nil && *ver.ExpectedYieldPct > 0 {
		yieldPct = *ver.ExpectedYieldPct
	} else if rawWeight > 0 {
		yieldPct = (cookedWeight / rawWeight) * 100.0
	}

	ingredients := make([]costing.IngredientCostItem, 0, len(ver.Ingredients))
	for _, ing := range ver.Ingredients {
		ingName := "วัตถุดิบ"
		if ing.Ingredient != nil {
			ingName = ing.Ingredient.NameTh
		}
		unitName := ""
		if ing.Unit != nil {
			unitName = ing.Unit.Symbol
		}

		unitPrice := 0.0
		trimLoss := 0.0
		// Default sensible prices for common crispy pork ingredients
		if strings.Contains(ingName, "หมู") {
			unitPrice = 160.0
			trimLoss = 5.0
		} else if strings.Contains(ingName, "น้ำมัน") {
			unitPrice = 45.0
		} else if strings.Contains(ingName, "เกลือ") {
			unitPrice = 15.0
		} else if strings.Contains(ingName, "น้ำส้มสายชู") {
			unitPrice = 25.0
		}

		ingredients = append(ingredients, costing.IngredientCostItem{
			ID:             s.idGen.NewUUID().String(),
			IngredientID:   &ing.IngredientID,
			IngredientName: ingName,
			Quantity:       ing.Quantity,
			UnitID:         &ing.UnitID,
			UnitName:       unitName,
			UnitPrice:      unitPrice,
			TrimLossPct:    trimLoss,
		})
	}

	// Standard operating defaults for crispy pork batch
	operations := []costing.OperationCostItem{
		{
			ID:        s.idGen.NewUUID().String(),
			Name:      "แก๊สหุงต้ม LPG สำหรับต้มและทอด (ชั่วโมงละ 25 บาท)",
			Category:  "GAS",
			Rate:      25.0,
			Usage:     2.5,
			TotalCost: 62.5,
		},
		{
			ID:        s.idGen.NewUUID().String(),
			Name:      "ค่าไฟฟ้าเตาอบลมร้อน Convection Oven",
			Category:  "ELECTRICITY",
			Rate:      5.0,
			Usage:     3.0,
			TotalCost: 15.0,
		},
	}

	// Standard packaging defaults
	packaging := []costing.PackagingCostItem{
		{
			ID:        s.idGen.NewUUID().String(),
			Name:      "กล่องกระดาษคราฟท์ฟู้ดเกรด + กระดาษซับมัน",
			UnitPrice: 3.5,
			Quantity:  40.0,
			TotalCost: 140.0,
		},
		{
			ID:        s.idGen.NewUUID().String(),
			Name:      "ถ้วยน้ำจิ้ม 2oz + ฝาปิด",
			UnitPrice: 1.0,
			Quantity:  40.0,
			TotalCost: 40.0,
		},
		{
			ID:        s.idGen.NewUUID().String(),
			Name:      "สติ๊กเกอร์โลโก้แบรนด์ หมูกรอบ มี จำกัด",
			UnitPrice: 0.5,
			Quantity:  40.0,
			TotalCost: 20.0,
		},
	}

	calc := &costing.CostCalculation{
		ID:                    s.idGen.NewUUID(),
		Name:                  fmt.Sprintf("ต้นทุน: %s (v%d)", rec.Name, ver.VersionNo),
		RecipeID:              &rec.ID,
		RecipeVersionID:       &ver.ID,
		RecipeName:            rec.Name,
		RawWeightKG:           rawWeight,
		CookedWeightKG:        cookedWeight,
		YieldPct:              yieldPct,
		WastagePct:            3.0,
		Ingredients:           ingredients,
		Operations:            operations,
		Packaging:             packaging,
		PortionWeightG:        150.0,
		TargetFoodCostPct:     35.0,
		TargetMarginPct:       65.0,
		ActualPricePerPortion: 120.0,
		CreatedAt:             s.clock.Now(),
		UpdatedAt:             s.clock.Now(),
	}

	calc.Calculate()
	return calc, nil
}
