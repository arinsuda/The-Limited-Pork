package trial

import (
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/domain/masterdata"
	"github.com/mookrob/backend/internal/domain/recipe"
)

type Outcome string

const (
	OutcomePending         Outcome = "PENDING"
	OutcomePassed          Outcome = "PASSED"
	OutcomeNeedsAdjustment Outcome = "NEEDS_ADJUSTMENT"
	OutcomeFailed          Outcome = "FAILED"
)

func (o Outcome) IsValid() bool {
	switch o {
	case OutcomePending, OutcomePassed, OutcomeNeedsAdjustment, OutcomeFailed:
		return true
	default:
		return false
	}
}

type Trial struct {
	ID              uuid.UUID          `json:"id"`
	RecipeID        uuid.UUID          `json:"recipeId"`
	Recipe          *recipe.Recipe     `json:"recipe,omitempty"`
	RecipeVersionID uuid.UUID          `json:"recipeVersionId"`
	RecipeVersionNo int                `json:"versionNo"`
	TrialNo         int                `json:"trialNo"`
	TrialDate       string             `json:"trialDate"` // YYYY-MM-DD
	Title           *string            `json:"title"`
	Outcome         Outcome            `json:"outcome"`
	InputQuantity   *float64           `json:"inputQuantity"`
	InputUnitID     *uuid.UUID         `json:"inputUnitId"`
	InputUnit       *masterdata.Unit   `json:"inputUnit,omitempty"`
	OutputQuantity  *float64           `json:"outputQuantity"`
	OutputUnitID    *uuid.UUID         `json:"outputUnitId"`
	OutputUnit      *masterdata.Unit   `json:"outputUnit,omitempty"`
	ActualYieldPct  *float64           `json:"actualYieldPct"`
	AmbientTempC    *float64           `json:"ambientTempC"`
	HumidityPct     *float64           `json:"humidityPct"`
	WeatherID       *uuid.UUID         `json:"weatherId"`
	Weather         *masterdata.Lookup `json:"weather,omitempty"`
	Summary         *string            `json:"summary"`
	Issues          *string            `json:"issues"`
	NextActions     *string            `json:"nextActions"`
	OverallScore    *float64           `json:"overallScore"`
	CreatedBy       uuid.UUID          `json:"createdBy"`
	Version         int                `json:"version"`
	CreatedAt       time.Time          `json:"createdAt"`
	UpdatedAt       time.Time          `json:"updatedAt"`

	// Related collections
	Ingredients []recipe.Ingredient `json:"ingredients"`
	Steps       []recipe.Step       `json:"steps"`
	Evaluations []Evaluation        `json:"evaluations"`
	Averages    []AttributeAverage  `json:"averages"`

	// Summary stats
	EvaluationCount int     `json:"evaluationCount"`
	PhotoCount      int     `json:"photoCount"`
	CoverURL        *string `json:"coverUrl,omitempty"`
}

type Evaluation struct {
	ID             uuid.UUID         `json:"id"`
	TrialID        uuid.UUID         `json:"trialId"`
	TasterName     string            `json:"tasterName"`
	OverallComment *string           `json:"overallComment"`
	AverageScore   float64           `json:"average"`
	Scores         []EvaluationScore `json:"scores"`
	CreatedBy      uuid.UUID         `json:"createdBy"`
	CreatedAt      time.Time         `json:"createdAt"`
}

type EvaluationScore struct {
	ID               uuid.UUID                  `json:"id"`
	EvaluationID     uuid.UUID                  `json:"evaluationId"`
	TasteAttributeID uuid.UUID                  `json:"tasteAttributeId"`
	TasteAttribute   *masterdata.TasteAttribute `json:"tasteAttribute,omitempty"`
	Score            float64                    `json:"score"`
	Comment          *string                    `json:"comment"`
}

type AttributeAverage struct {
	TasteAttributeID uuid.UUID `json:"tasteAttributeId"`
	Code             string    `json:"code"`
	NameTh           string    `json:"nameTh"`
	NameEn           string    `json:"nameEn"`
	Color            string    `json:"color"`
	MinScore         int       `json:"minScore"`
	MaxScore         int       `json:"maxScore"`
	Average          float64   `json:"average"`
	Count            int       `json:"count"`
}

// ComputeAverages calculates per-attribute averages and the overall score from evaluations
func ComputeAverages(evals []Evaluation, attrs []masterdata.TasteAttribute) ([]AttributeAverage, *float64) {
	if len(evals) == 0 {
		return []AttributeAverage{}, nil
	}

	attrMap := make(map[uuid.UUID]masterdata.TasteAttribute)
	for _, a := range attrs {
		attrMap[a.ID] = a
	}

	sums := make(map[uuid.UUID]float64)
	counts := make(map[uuid.UUID]int)

	for _, ev := range evals {
		for _, s := range ev.Scores {
			sums[s.TasteAttributeID] += s.Score
			counts[s.TasteAttributeID]++
		}
	}

	var results []AttributeAverage
	var totalAvgSum float64
	var totalAttrsWithScores int

	for _, a := range attrs {
		cnt := counts[a.ID]
		if cnt > 0 {
			avg := math.Round((sums[a.ID]/float64(cnt))*100) / 100
			results = append(results, AttributeAverage{
				TasteAttributeID: a.ID,
				Code:             a.Code,
				NameTh:           a.NameTh,
				NameEn:           a.NameEn,
				Color:            a.Color,
				MinScore:         a.MinScore,
				MaxScore:         a.MaxScore,
				Average:          avg,
				Count:            cnt,
			})
			totalAvgSum += avg
			totalAttrsWithScores++
		}
	}

	if totalAttrsWithScores == 0 {
		return results, nil
	}

	overall := math.Round((totalAvgSum/float64(totalAttrsWithScores))*100) / 100
	return results, &overall
}

type Repository interface {
	List(recipeID *uuid.UUID, outcome string, dateFrom, dateTo *string, q string, limit, offset int) ([]Trial, int, error)
	GetByID(id uuid.UUID) (*Trial, error)
	Create(t *Trial, ingrs []recipe.Ingredient, steps []recipe.Step) error
	Update(t *Trial, ingrs []recipe.Ingredient, steps []recipe.Step) error
	UpdateOutcome(id uuid.UUID, outcome Outcome, version int) error
	Delete(id uuid.UUID) error

	// Evaluations
	AddEvaluation(e *Evaluation) error
	UpdateEvaluation(e *Evaluation) error
	DeleteEvaluation(trialID, evaluationID uuid.UUID) error
	ListEvaluations(trialID uuid.UUID) ([]Evaluation, error)

	// Per-recipe trial number sequence
	NextTrialNo(recipeID uuid.UUID) (int, error)
	GetTrialsByIDs(ids []uuid.UUID) ([]Trial, error)
}
