package recipe

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/domain/masterdata"
)

type Status string

const (
	StatusDraft    Status = "DRAFT"
	StatusTesting  Status = "TESTING"
	StatusApproved Status = "APPROVED"
	StatusArchived Status = "ARCHIVED"
)

func (s Status) IsValid() bool {
	switch s {
	case StatusDraft, StatusTesting, StatusApproved, StatusArchived:
		return true
	default:
		return false
	}
}

func (s Status) CanTransitionTo(next Status) bool {
	if s == next {
		return true
	}
	switch s {
	case StatusDraft:
		return next == StatusTesting || next == StatusArchived
	case StatusTesting:
		return next == StatusDraft || next == StatusApproved || next == StatusArchived
	case StatusApproved:
		return next == StatusTesting || next == StatusArchived
	case StatusArchived:
		return next == StatusDraft
	default:
		return false
	}
}

type Recipe struct {
	ID               uuid.UUID           `json:"id"`
	Code             string              `json:"code"`
	Name             string              `json:"name"`
	Description      *string             `json:"description"`
	SourceURL        *string             `json:"sourceUrl,omitempty"`
	Status           Status              `json:"status"`
	CurrentVersionID *uuid.UUID          `json:"currentVersionId"`
	CurrentVersion   *Version            `json:"currentVersion,omitempty"`
	Tags             []masterdata.Lookup `json:"tags"`
	CreatedBy        uuid.UUID           `json:"createdBy"`
	Version          int                 `json:"version"`
	CreatedAt        time.Time           `json:"createdAt"`
	UpdatedAt        time.Time           `json:"updatedAt"`

	// Summary stats
	TrialCount       int        `json:"trialCount"`
	LatestTrialDate  *string    `json:"latestTrialDate,omitempty"`
	BestOverallScore *float64   `json:"bestOverallScore,omitempty"`
	CoverURL         *string    `json:"coverUrl,omitempty"`
}

type Version struct {
	ID                     uuid.UUID          `json:"id"`
	RecipeID               uuid.UUID          `json:"recipeId"`
	VersionNo              int                `json:"versionNo"`
	ChangeNote             *string            `json:"changeNote"`
	InputQuantity          *float64           `json:"inputQuantity"`
	InputUnitID            *uuid.UUID         `json:"inputUnitId"`
	InputUnit              *masterdata.Unit   `json:"inputUnit,omitempty"`
	ExpectedOutputQuantity *float64           `json:"expectedOutputQuantity"`
	ExpectedOutputUnitID   *uuid.UUID         `json:"expectedOutputUnitId"`
	ExpectedOutputUnit     *masterdata.Unit   `json:"expectedOutputUnit,omitempty"`
	ExpectedYieldPct       *float64           `json:"expectedYieldPct"`
	Notes                  *string            `json:"notes"`
	Ingredients            []Ingredient       `json:"ingredients"`
	Steps                  []Step             `json:"steps"`
	IngredientCount        int                `json:"ingredientCount"`
	StepCount              int                `json:"stepCount"`
	TrialCount             int                `json:"trialCount"`
	CreatedBy              uuid.UUID          `json:"createdBy"`
	CreatedAt              time.Time          `json:"createdAt"`
}

type Ingredient struct {
	ID              uuid.UUID              `json:"id"`
	VersionID       uuid.UUID              `json:"versionId"`
	LineNo          int                    `json:"lineNo"`
	IngredientID    uuid.UUID              `json:"ingredientId"`
	Ingredient      *masterdata.Ingredient `json:"ingredient,omitempty"`
	Quantity        float64                `json:"quantity"`
	UnitID          uuid.UUID              `json:"unitId"`
	Unit            *masterdata.Unit       `json:"unit,omitempty"`
	PreparationNote *string                `json:"preparationNote"`
	IsOptional      bool                   `json:"isOptional"`
}

type Step struct {
	ID              uuid.UUID                   `json:"id"`
	VersionID       uuid.UUID                   `json:"versionId"`
	StepNo          int                         `json:"stepNo"`
	RoundNo         *int                        `json:"roundNo"`
	StepTypeID      uuid.UUID                   `json:"stepTypeId"`
	StepType        *masterdata.ProcessStepType `json:"stepType,omitempty"`
	Title           *string                     `json:"title"`
	Instruction     *string                     `json:"instruction"`
	TemperatureC    *float64                    `json:"temperatureC"`
	DurationMinutes *float64                    `json:"durationMinutes"`
	OrientationID   *uuid.UUID                  `json:"orientationId"`
	Orientation     *masterdata.Lookup          `json:"orientation,omitempty"`
	Params          map[string]any              `json:"params"`
	Notes           *string                     `json:"notes"`
}

// ComputeRoundNumbers calculates roundNo for steps that are repeatable (e.g. FRY round 1, FRY round 2)
func ComputeRoundNumbers(steps []Step, stepTypesMap map[uuid.UUID]masterdata.ProcessStepType) {
	counts := make(map[uuid.UUID]int)
	for i := range steps {
		st, ok := stepTypesMap[steps[i].StepTypeID]
		if ok && st.IsRepeatable {
			counts[steps[i].StepTypeID]++
			r := counts[steps[i].StepTypeID]
			steps[i].RoundNo = &r
		} else {
			steps[i].RoundNo = nil
		}
	}
}

// ComputeYieldPct calculates expected yield % if input and output units are comparable
func ComputeYieldPct(inputQty float64, inputUnit *masterdata.Unit, outputQty float64, outputUnit *masterdata.Unit) *float64 {
	if inputQty <= 0 || outputQty <= 0 || inputUnit == nil || outputUnit == nil {
		return nil
	}
	if inputUnit.Dimension != outputUnit.Dimension {
		return nil
	}

	inputBase := inputQty * inputUnit.FactorToBase
	outputBase := outputQty * outputUnit.FactorToBase
	if inputBase <= 0 {
		return nil
	}

	pct := (outputBase / inputBase) * 100.0
	// round to 2 decimals
	rounded := float64(int(pct*100+0.5)) / 100
	return &rounded
}

type Repository interface {
	List(status string, tagID *uuid.UUID, q string, limit, offset int) ([]Recipe, int, error)
	GetByID(id uuid.UUID) (*Recipe, error)
	GetByCode(code string) (*Recipe, error)
	Create(r *Recipe, v *Version, tagIDs []uuid.UUID) error
	Update(r *Recipe, tagIDs []uuid.UUID) error
	UpdateStatus(id uuid.UUID, status Status, version int) error
	Delete(id uuid.UUID) error

	// Versions
	ListVersions(recipeID uuid.UUID) ([]Version, error)
	GetVersionByID(id uuid.UUID) (*Version, error)
	GetVersionByNo(recipeID uuid.UUID, versionNo int) (*Version, error)
	CreateVersion(v *Version) error
	UpdateVersion(v *Version) error
	SetCurrentVersion(recipeID, versionID uuid.UUID) error
	CountTrialsByVersionID(versionID uuid.UUID) (int, error)

	// Running code generator
	NextRecipeCode(prefix string) (string, error)
}

func FormatRecipeCode(prefix string, seq int64) string {
	return fmt.Sprintf("%s-%04d", prefix, seq)
}
