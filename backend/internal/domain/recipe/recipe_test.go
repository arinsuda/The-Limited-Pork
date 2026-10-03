package recipe_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/domain/masterdata"
	"github.com/mookrob/backend/internal/domain/recipe"
)

func TestComputeYieldPct(t *testing.T) {
	unitKG := &masterdata.Unit{
		Dimension:    masterdata.DimensionMass,
		FactorToBase: 1000.0,
	}
	unitG := &masterdata.Unit{
		Dimension:    masterdata.DimensionMass,
		FactorToBase: 1.0,
	}
	unitML := &masterdata.Unit{
		Dimension:    masterdata.DimensionVolume,
		FactorToBase: 1.0,
	}

	// 1 KG raw pork -> 650 G crispy pork => 65% yield
	yield := recipe.ComputeYieldPct(1.0, unitKG, 650.0, unitG)
	if yield == nil {
		t.Fatalf("expected yield not nil")
	}
	if *yield != 65.0 {
		t.Errorf("expected 65.0, got %f", *yield)
	}

	// 2 KG raw pork -> 1.3 KG crispy pork => 65% yield
	yield2 := recipe.ComputeYieldPct(2.0, unitKG, 1.3, unitKG)
	if yield2 == nil || *yield2 != 65.0 {
		t.Errorf("expected 65.0, got %v", yield2)
	}

	// Incompatible dimensions: Mass vs Volume -> nil
	yieldMismatched := recipe.ComputeYieldPct(1.0, unitKG, 500.0, unitML)
	if yieldMismatched != nil {
		t.Errorf("expected nil for mismatched dimensions, got %v", yieldMismatched)
	}

	// Zero or negative quantity -> nil
	yieldZero := recipe.ComputeYieldPct(0, unitKG, 100, unitG)
	if yieldZero != nil {
		t.Errorf("expected nil for zero quantity, got %v", yieldZero)
	}
}

func TestComputeRoundNumbers(t *testing.T) {
	fryID := uuid.New()
	boilID := uuid.New()
	restID := uuid.New()

	stMap := map[uuid.UUID]masterdata.ProcessStepType{
		fryID: {
			ID:           fryID,
			Code:         "FRY",
			IsRepeatable: true,
		},
		boilID: {
			ID:           boilID,
			Code:         "BOIL",
			IsRepeatable: false,
		},
		restID: {
			ID:           restID,
			Code:         "REST",
			IsRepeatable: false,
		},
	}

	steps := []recipe.Step{
		{StepTypeID: boilID}, // Non-repeatable
		{StepTypeID: fryID},  // Repeatable -> round 1
		{StepTypeID: restID}, // Non-repeatable
		{StepTypeID: fryID},  // Repeatable -> round 2
	}

	recipe.ComputeRoundNumbers(steps, stMap)

	if steps[0].RoundNo != nil {
		t.Errorf("step 0 expected nil roundNo, got %v", *steps[0].RoundNo)
	}
	if steps[1].RoundNo == nil || *steps[1].RoundNo != 1 {
		t.Errorf("step 1 expected roundNo 1, got %v", steps[1].RoundNo)
	}
	if steps[2].RoundNo != nil {
		t.Errorf("step 2 expected nil roundNo, got %v", *steps[2].RoundNo)
	}
	if steps[3].RoundNo == nil || *steps[3].RoundNo != 2 {
		t.Errorf("step 3 expected roundNo 2, got %v", steps[3].RoundNo)
	}
}

func TestStatusTransitions(t *testing.T) {
	// DRAFT -> TESTING: allowed
	if !recipe.StatusDraft.CanTransitionTo(recipe.StatusTesting) {
		t.Errorf("expected DRAFT -> TESTING allowed")
	}

	// TESTING -> APPROVED: allowed
	if !recipe.StatusTesting.CanTransitionTo(recipe.StatusApproved) {
		t.Errorf("expected TESTING -> APPROVED allowed")
	}

	// DRAFT -> APPROVED: not allowed directly
	if recipe.StatusDraft.CanTransitionTo(recipe.StatusApproved) {
		t.Errorf("expected DRAFT -> APPROVED NOT allowed")
	}

	// APPROVED -> ARCHIVED: allowed
	if !recipe.StatusApproved.CanTransitionTo(recipe.StatusArchived) {
		t.Errorf("expected APPROVED -> ARCHIVED allowed")
	}

	// ARCHIVED -> DRAFT: allowed (reactivate for editing)
	if !recipe.StatusArchived.CanTransitionTo(recipe.StatusDraft) {
		t.Errorf("expected ARCHIVED -> DRAFT allowed")
	}
}
