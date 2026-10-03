package trial_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/domain/masterdata"
	"github.com/mookrob/backend/internal/domain/trial"
)

func TestComputeAverages(t *testing.T) {
	attrSour := uuid.New()
	attrCrisp := uuid.New()
	attrUmami := uuid.New()

	attrs := []masterdata.TasteAttribute{
		{ID: attrSour, Code: "SOUR", NameTh: "เปรี้ยว", MinScore: 1, MaxScore: 5},
		{ID: attrCrisp, Code: "CRISPINESS", NameTh: "ความกรอบ", MinScore: 1, MaxScore: 5},
		{ID: attrUmami, Code: "UMAMI", NameTh: "นัว", MinScore: 1, MaxScore: 5},
	}

	evals := []trial.Evaluation{
		{
			TasterName: "Chef A",
			Scores: []trial.EvaluationScore{
				{TasteAttributeID: attrSour, Score: 3.0},
				{TasteAttributeID: attrCrisp, Score: 5.0},
				{TasteAttributeID: attrUmami, Score: 4.0},
			},
		},
		{
			TasterName: "Chef B",
			Scores: []trial.EvaluationScore{
				{TasteAttributeID: attrSour, Score: 2.0},
				{TasteAttributeID: attrCrisp, Score: 4.0},
				{TasteAttributeID: attrUmami, Score: 4.0},
			},
		},
	}

	averages, overall := trial.ComputeAverages(evals, attrs)

	if overall == nil {
		t.Fatalf("expected overall not nil")
	}

	avgMap := make(map[uuid.UUID]float64)
	for _, avg := range averages {
		avgMap[avg.TasteAttributeID] = avg.Average
	}

	// Sour: (3 + 2)/2 = 2.5
	if avgMap[attrSour] != 2.5 {
		t.Errorf("expected sour 2.5, got %f", avgMap[attrSour])
	}

	// Crispiness: (5 + 4)/2 = 4.5
	if avgMap[attrCrisp] != 4.5 {
		t.Errorf("expected crispiness 4.5, got %f", avgMap[attrCrisp])
	}

	// Umami: (4 + 4)/2 = 4.0
	if avgMap[attrUmami] != 4.0 {
		t.Errorf("expected umami 4.0, got %f", avgMap[attrUmami])
	}

	// Overall: (2.5 + 4.5 + 4.0) / 3 = 11.0 / 3 = 3.67
	expectedOverall := 3.67
	if *overall != expectedOverall {
		t.Errorf("expected overall %f, got %f", expectedOverall, *overall)
	}
}

func TestOutcomeValidation(t *testing.T) {
	if !trial.OutcomePending.IsValid() {
		t.Errorf("expected PENDING valid")
	}
	if !trial.OutcomePassed.IsValid() {
		t.Errorf("expected PASSED valid")
	}
	if !trial.OutcomeNeedsAdjustment.IsValid() {
		t.Errorf("expected NEEDS_ADJUSTMENT valid")
	}
	if !trial.OutcomeFailed.IsValid() {
		t.Errorf("expected FAILED valid")
	}
	if trial.Outcome("INVALID").IsValid() {
		t.Errorf("expected INVALID not valid")
	}
}
