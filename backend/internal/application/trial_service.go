package application

import (
	"context"
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/domain/attachment"
	"github.com/mookrob/backend/internal/domain/masterdata"
	"github.com/mookrob/backend/internal/domain/notification"
	"github.com/mookrob/backend/internal/domain/recipe"
	"github.com/mookrob/backend/internal/domain/trial"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type TrialService struct {
	trialRepo      trial.Repository
	recipeRepo     recipe.Repository
	mdRepo         masterdata.MasterDataRepository
	attRepo        attachment.Repository
	storage        ports.ObjectStorage
	eventPublisher ports.EventPublisher
	txManager      ports.TxManager
	clock          ports.Clock
	idGen          ports.IDGen
	hub            ports.WebSocketHub
	cfg            *config.Config
}

func NewTrialService(
	trialRepo trial.Repository,
	recipeRepo recipe.Repository,
	mdRepo masterdata.MasterDataRepository,
	attRepo attachment.Repository,
	storage ports.ObjectStorage,
	eventPublisher ports.EventPublisher,
	txManager ports.TxManager,
	clock ports.Clock,
	idGen ports.IDGen,
	hub ports.WebSocketHub,
	cfg *config.Config,
) *TrialService {
	return &TrialService{
		trialRepo:      trialRepo,
		recipeRepo:     recipeRepo,
		mdRepo:         mdRepo,
		attRepo:        attRepo,
		storage:        storage,
		eventPublisher: eventPublisher,
		txManager:      txManager,
		clock:          clock,
		idGen:          idGen,
		hub:            hub,
		cfg:            cfg,
	}
}

type CreateTrialInput struct {
	RecipeID        uuid.UUID               `json:"recipeId"`
	RecipeVersionID uuid.UUID               `json:"recipeVersionId"`
	TrialDate       string                  `json:"trialDate"` // YYYY-MM-DD
	Title           *string                 `json:"title"`
	InputQuantity   *float64                `json:"inputQuantity"`
	InputUnitID     *uuid.UUID              `json:"inputUnitId"`
	OutputQuantity  *float64                `json:"outputQuantity"`
	OutputUnitID    *uuid.UUID              `json:"outputUnitId"`
	AmbientTempC    *float64                `json:"ambientTempC"`
	HumidityPct     *float64                `json:"humidityPct"`
	WeatherID       *uuid.UUID              `json:"weatherId"`
	Summary         *string                 `json:"summary"`
	Issues          *string                 `json:"issues"`
	NextActions     *string                 `json:"nextActions"`
	Ingredients     []RecipeIngredientInput `json:"ingredients"`
	Steps           []ProcessStepInput      `json:"steps"`
}

type UpdateTrialInput struct {
	TrialDate      string                  `json:"trialDate"`
	Title          *string                 `json:"title"`
	InputQuantity  *float64                `json:"inputQuantity"`
	InputUnitID    *uuid.UUID              `json:"inputUnitId"`
	OutputQuantity *float64                `json:"outputQuantity"`
	OutputUnitID   *uuid.UUID              `json:"outputUnitId"`
	AmbientTempC   *float64                `json:"ambientTempC"`
	HumidityPct    *float64                `json:"humidityPct"`
	WeatherID      *uuid.UUID              `json:"weatherId"`
	Summary        *string                 `json:"summary"`
	Issues         *string                 `json:"issues"`
	NextActions    *string                 `json:"nextActions"`
	Ingredients    []RecipeIngredientInput `json:"ingredients"`
	Steps          []ProcessStepInput      `json:"steps"`
	Version        int                     `json:"version"`
}

type EvaluationInput struct {
	TasterName     string        `json:"tasterName"`
	OverallComment *string       `json:"overallComment"`
	Scores         []ScoreInput  `json:"scores"`
}

type ScoreInput struct {
	TasteAttributeID uuid.UUID `json:"tasteAttributeId"`
	Score            float64   `json:"score"`
	Comment          *string   `json:"comment"`
}

func (s *TrialService) List(ctx context.Context, recipeID *uuid.UUID, outcome string, dateFrom, dateTo *string, params pagination.Params) (pagination.Paged[trial.Trial], error) {
	list, total, err := s.trialRepo.List(recipeID, outcome, dateFrom, dateTo, params.Q, params.Limit(), params.Offset())
	if err != nil {
		return pagination.Paged[trial.Trial]{}, err
	}

	for i := range list {
		cover, err := s.attRepo.GetCover(attachment.OwnerTypeTrial, list[i].ID)
		if err == nil && cover != nil {
			url, _ := s.storage.PresignGet(ctx, cover.ObjectKey, s.cfg.ShutdownTimeoutSeconds)
			list[i].CoverURL = &url
		}
	}

	return pagination.NewPaged(list, params.Page, params.PageSize, total), nil
}

func (s *TrialService) GetByID(ctx context.Context, id uuid.UUID) (*trial.Trial, error) {
	t, err := s.trialRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	attrs, _ := s.mdRepo.ListTasteAttributes(true)
	averages, overall := trial.ComputeAverages(t.Evaluations, attrs)
	t.Averages = averages
	t.OverallScore = overall

	cover, err := s.attRepo.GetCover(attachment.OwnerTypeTrial, t.ID)
	if err == nil && cover != nil {
		url, _ := s.storage.PresignGet(ctx, cover.ObjectKey, s.cfg.ShutdownTimeoutSeconds)
		t.CoverURL = &url
	}

	return t, nil
}

func (s *TrialService) Create(ctx context.Context, actorID uuid.UUID, input CreateTrialInput) (*trial.Trial, error) {
	if input.TrialDate == "" {
		return nil, apperror.Validation("trialDate is required", apperror.Detail{Field: "trialDate", Code: "required"})
	}

	rec, err := s.recipeRepo.GetByID(input.RecipeID)
	if err != nil {
		return nil, err
	}

	recVer, err := s.recipeRepo.GetVersionByID(input.RecipeVersionID)
	if err != nil {
		return nil, err
	}

	// Allocate per-recipe running number
	nextTrialNo, err := s.trialRepo.NextTrialNo(input.RecipeID)
	if err != nil {
		return nil, err
	}

	trialID := s.idGen.NewUUID()

	// Compute yield
	var inputUnit, outputUnit *masterdata.Unit
	if input.InputUnitID != nil {
		inputUnit, _ = s.mdRepo.GetUnitByID(*input.InputUnitID)
	}
	if input.OutputUnitID != nil {
		outputUnit, _ = s.mdRepo.GetUnitByID(*input.OutputUnitID)
	}

	var yieldPct *float64
	if input.InputQuantity != nil && input.OutputQuantity != nil {
		yieldPct = recipe.ComputeYieldPct(*input.InputQuantity, inputUnit, *input.OutputQuantity, outputUnit)
	}

	// Step types map for repeatable round numbering
	stepTypes, _ := s.mdRepo.ListProcessStepTypes(true)
	stMap := make(map[uuid.UUID]masterdata.ProcessStepType)
	for _, st := range stepTypes {
		stMap[st.ID] = st
	}

	// Ingredients: copy from version if empty
	var ingrs []recipe.Ingredient
	if len(input.Ingredients) > 0 {
		for idx, item := range input.Ingredients {
			ingrs = append(ingrs, recipe.Ingredient{
				ID:              s.idGen.NewUUID(),
				LineNo:          idx + 1,
				IngredientID:    item.IngredientID,
				Quantity:        item.Quantity,
				UnitID:          item.UnitID,
				PreparationNote: item.PreparationNote,
				IsOptional:      item.IsOptional,
			})
		}
	} else {
		for _, item := range recVer.Ingredients {
			ingrs = append(ingrs, recipe.Ingredient{
				ID:              s.idGen.NewUUID(),
				LineNo:          item.LineNo,
				IngredientID:    item.IngredientID,
				Quantity:        item.Quantity,
				UnitID:          item.UnitID,
				PreparationNote: item.PreparationNote,
				IsOptional:      item.IsOptional,
			})
		}
	}

	// Steps: copy from version if empty
	var steps []recipe.Step
	if len(input.Steps) > 0 {
		for idx, item := range input.Steps {
			params := item.Params
			if params == nil {
				params = make(map[string]any)
			}
			steps = append(steps, recipe.Step{
				ID:              s.idGen.NewUUID(),
				StepNo:          idx + 1,
				StepTypeID:      item.StepTypeID,
				Title:           item.Title,
				Instruction:     item.Instruction,
				TemperatureC:    item.TemperatureC,
				DurationMinutes: item.DurationMinutes,
				OrientationID:   item.OrientationID,
				Params:          params,
				Notes:           item.Notes,
			})
		}
	} else {
		for _, item := range recVer.Steps {
			steps = append(steps, recipe.Step{
				ID:              s.idGen.NewUUID(),
				StepNo:          item.StepNo,
				StepTypeID:      item.StepTypeID,
				Title:           item.Title,
				Instruction:     item.Instruction,
				TemperatureC:    item.TemperatureC,
				DurationMinutes: item.DurationMinutes,
				OrientationID:   item.OrientationID,
				Params:          item.Params,
				Notes:           item.Notes,
			})
		}
	}
	recipe.ComputeRoundNumbers(steps, stMap)

	t := &trial.Trial{
		ID:              trialID,
		RecipeID:        input.RecipeID,
		RecipeVersionID: input.RecipeVersionID,
		TrialNo:         nextTrialNo,
		TrialDate:       input.TrialDate,
		Title:           input.Title,
		Outcome:         trial.OutcomePending,
		InputQuantity:   input.InputQuantity,
		InputUnitID:     input.InputUnitID,
		OutputQuantity:  input.OutputQuantity,
		OutputUnitID:    input.OutputUnitID,
		ActualYieldPct:  yieldPct,
		AmbientTempC:    input.AmbientTempC,
		HumidityPct:     input.HumidityPct,
		WeatherID:       input.WeatherID,
		Summary:         input.Summary,
		Issues:          input.Issues,
		NextActions:     input.NextActions,
		OverallScore:    nil,
		CreatedBy:       actorID,
		Version:         1,
		CreatedAt:       s.clock.Now(),
		UpdatedAt:       s.clock.Now(),
	}

	err = s.txManager.WithTx(ctx, func(txCtx context.Context) error {
		if err := s.trialRepo.Create(t, ingrs, steps); err != nil {
			return err
		}

		return s.eventPublisher.PublishEvent(txCtx, string(notification.TypeTrialCreated), ports.OutboxNotificationPayload{
			Type:     notification.TypeTrialCreated,
			Severity: notification.SeverityInfo,
			Params: map[string]any{
				"recipeName": rec.Name,
				"trialNo":    nextTrialNo,
				"trialDate":  input.TrialDate,
			},
			Link:     stringPtr(fmt.Sprintf("/trials/%s", trialID)),
			PermCode: "trials.read",
			ActorID:  actorID,
		})
	})

	if err != nil {
		return nil, err
	}

	s.hub.BroadcastEntityChanged("trial", trialID, "created")
	return s.GetByID(ctx, trialID)
}

func (s *TrialService) Update(ctx context.Context, id uuid.UUID, input UpdateTrialInput) (*trial.Trial, error) {
	t, err := s.trialRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	t.TrialDate = input.TrialDate
	t.Title = input.Title
	t.InputQuantity = input.InputQuantity
	t.InputUnitID = input.InputUnitID
	t.OutputQuantity = input.OutputQuantity
	t.OutputUnitID = input.OutputUnitID
	t.AmbientTempC = input.AmbientTempC
	t.HumidityPct = input.HumidityPct
	t.WeatherID = input.WeatherID
	t.Summary = input.Summary
	t.Issues = input.Issues
	t.NextActions = input.NextActions
	t.Version = input.Version

	var inputUnit, outputUnit *masterdata.Unit
	if input.InputUnitID != nil {
		inputUnit, _ = s.mdRepo.GetUnitByID(*input.InputUnitID)
	}
	if input.OutputUnitID != nil {
		outputUnit, _ = s.mdRepo.GetUnitByID(*input.OutputUnitID)
	}
	if input.InputQuantity != nil && input.OutputQuantity != nil {
		t.ActualYieldPct = recipe.ComputeYieldPct(*input.InputQuantity, inputUnit, *input.OutputQuantity, outputUnit)
	}

	var ingrs []recipe.Ingredient
	if input.Ingredients != nil {
		for idx, item := range input.Ingredients {
			ingrs = append(ingrs, recipe.Ingredient{
				ID:              s.idGen.NewUUID(),
				LineNo:          idx + 1,
				IngredientID:    item.IngredientID,
				Quantity:        item.Quantity,
				UnitID:          item.UnitID,
				PreparationNote: item.PreparationNote,
				IsOptional:      item.IsOptional,
			})
		}
	}

	stepTypes, _ := s.mdRepo.ListProcessStepTypes(true)
	stMap := make(map[uuid.UUID]masterdata.ProcessStepType)
	for _, st := range stepTypes {
		stMap[st.ID] = st
	}

	var steps []recipe.Step
	if input.Steps != nil {
		for idx, item := range input.Steps {
			params := item.Params
			if params == nil {
				params = make(map[string]any)
			}
			steps = append(steps, recipe.Step{
				ID:              s.idGen.NewUUID(),
				StepNo:          idx + 1,
				StepTypeID:      item.StepTypeID,
				Title:           item.Title,
				Instruction:     item.Instruction,
				TemperatureC:    item.TemperatureC,
				DurationMinutes: item.DurationMinutes,
				OrientationID:   item.OrientationID,
				Params:          params,
				Notes:           item.Notes,
			})
		}
		recipe.ComputeRoundNumbers(steps, stMap)
	}

	if err := s.trialRepo.Update(t, ingrs, steps); err != nil {
		return nil, err
	}

	s.hub.BroadcastEntityChanged("trial", id, "updated")
	return s.GetByID(ctx, id)
}

func (s *TrialService) UpdateOutcome(ctx context.Context, actorID uuid.UUID, id uuid.UUID, outcome trial.Outcome, version int) (*trial.Trial, error) {
	if !outcome.IsValid() {
		return nil, apperror.Validation("invalid trial outcome")
	}

	t, err := s.trialRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	err = s.txManager.WithTx(ctx, func(txCtx context.Context) error {
		if err := s.trialRepo.UpdateOutcome(id, outcome, version); err != nil {
			return err
		}

		return s.eventPublisher.PublishEvent(txCtx, string(notification.TypeTrialOutcomeChanged), ports.OutboxNotificationPayload{
			Type:     notification.TypeTrialOutcomeChanged,
			Severity: notification.SeverityInfo,
			Params: map[string]any{
				"trialNo": t.TrialNo,
				"outcome": string(outcome),
			},
			Link:     stringPtr(fmt.Sprintf("/trials/%s", id)),
			PermCode: "trials.read",
			ActorID:  actorID,
		})
	})

	if err != nil {
		return nil, err
	}

	s.hub.BroadcastEntityChanged("trial", id, "updated")
	return s.GetByID(ctx, id)
}

func (s *TrialService) Delete(ctx context.Context, id uuid.UUID) error {
	if err := s.trialRepo.Delete(id); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("trial", id, "deleted")
	return nil
}

func (s *TrialService) AddEvaluation(ctx context.Context, actorID uuid.UUID, trialID uuid.UUID, input EvaluationInput) (*trial.Trial, error) {
	if input.TasterName == "" {
		return nil, apperror.Validation("tasterName is required")
	}

	attrs, _ := s.mdRepo.ListTasteAttributes(true)
	attrMap := make(map[uuid.UUID]masterdata.TasteAttribute)
	for _, a := range attrs {
		attrMap[a.ID] = a
	}

	var scores []trial.EvaluationScore
	var totalScore float64

	for i, sc := range input.Scores {
		attr, ok := attrMap[sc.TasteAttributeID]
		if !ok {
			return nil, apperror.Validation(fmt.Sprintf("unknown taste attribute %s", sc.TasteAttributeID))
		}
		if sc.Score < float64(attr.MinScore) || sc.Score > float64(attr.MaxScore) {
			return nil, apperror.Validation(
				fmt.Sprintf("score %.1f must be between %d and %d", sc.Score, attr.MinScore, attr.MaxScore),
				apperror.Detail{
					Field: fmt.Sprintf("scores[%d].score", i),
					Code:  "range",
					Param: fmt.Sprintf("%d-%d", attr.MinScore, attr.MaxScore),
				},
			)
		}

		scores = append(scores, trial.EvaluationScore{
			ID:               s.idGen.NewUUID(),
			TasteAttributeID: sc.TasteAttributeID,
			Score:            sc.Score,
			Comment:          sc.Comment,
		})
		totalScore += sc.Score
	}

	avgScore := 0.0
	if len(scores) > 0 {
		avgScore = math.Round((totalScore/float64(len(scores)))*100) / 100
	}

	evalID := s.idGen.NewUUID()
	ev := &trial.Evaluation{
		ID:             evalID,
		TrialID:        trialID,
		TasterName:     input.TasterName,
		OverallComment: input.OverallComment,
		AverageScore:   avgScore,
		Scores:         scores,
		CreatedBy:      actorID,
		CreatedAt:      s.clock.Now(),
	}

	err := s.txManager.WithTx(ctx, func(txCtx context.Context) error {
		if err := s.trialRepo.AddEvaluation(ev); err != nil {
			return err
		}

		tr, _ := s.trialRepo.GetByID(trialID)
		trialNo := 0
		if tr != nil {
			trialNo = tr.TrialNo
		}

		return s.eventPublisher.PublishEvent(txCtx, string(notification.TypeTrialEvaluated), ports.OutboxNotificationPayload{
			Type:     notification.TypeTrialEvaluated,
			Severity: notification.SeverityInfo,
			Params: map[string]any{
				"trialNo":    trialNo,
				"tasterName": input.TasterName,
				"score":      avgScore,
			},
			Link:     stringPtr(fmt.Sprintf("/trials/%s", trialID)),
			PermCode: "trials.read",
			ActorID:  actorID,
		})
	})

	if err != nil {
		return nil, err
	}

	s.hub.BroadcastEntityChanged("trial", trialID, "updated")
	return s.GetByID(ctx, trialID)
}

func (s *TrialService) DeleteEvaluation(ctx context.Context, trialID, evaluationID uuid.UUID) (*trial.Trial, error) {
	if err := s.trialRepo.DeleteEvaluation(trialID, evaluationID); err != nil {
		return nil, err
	}
	s.hub.BroadcastEntityChanged("trial", trialID, "updated")
	return s.GetByID(ctx, trialID)
}

type TrialComparisonResult struct {
	Attributes []masterdata.TasteAttribute `json:"attributes"`
	Trials     []trial.Trial               `json:"trials"`
}

func (s *TrialService) CompareTrials(ctx context.Context, trialIDs []uuid.UUID) (*TrialComparisonResult, error) {
	if len(trialIDs) < 2 {
		return nil, apperror.BadRequest("at least 2 trials required for comparison")
	}
	if len(trialIDs) > s.cfg.TrialCompareMax {
		return nil, apperror.BadRequest(fmt.Sprintf("maximum %d trials can be compared at once", s.cfg.TrialCompareMax))
	}

	trials, err := s.trialRepo.GetTrialsByIDs(trialIDs)
	if err != nil {
		return nil, err
	}

	attrs, _ := s.mdRepo.ListTasteAttributes(true)

	for i := range trials {
		averages, overall := trial.ComputeAverages(trials[i].Evaluations, attrs)
		trials[i].Averages = averages
		trials[i].OverallScore = overall
	}

	return &TrialComparisonResult{
		Attributes: attrs,
		Trials:     trials,
	}, nil
}

type ScoreTrendPoint struct {
	TrialID      uuid.UUID   `json:"trialId"`
	TrialNo      int         `json:"trialNo"`
	TrialDate    string      `json:"trialDate"`
	VersionNo    int         `json:"versionNo"`
	OverallScore *float64    `json:"overallScore"`
	Scores       []ScoreItem `json:"scores"`
}

type ScoreItem struct {
	TasteAttributeID uuid.UUID `json:"tasteAttributeId"`
	Average          float64   `json:"average"`
}

func (s *TrialService) GetScoreTrend(ctx context.Context, recipeID uuid.UUID) ([]ScoreTrendPoint, error) {
	trials, _, err := s.trialRepo.List(&recipeID, "", nil, nil, "", 100, 0)
	if err != nil {
		return nil, err
	}

	attrs, _ := s.mdRepo.ListTasteAttributes(true)

	var points []ScoreTrendPoint
	for _, t := range trials {
		fullTrial, err := s.trialRepo.GetByID(t.ID)
		if err != nil {
			continue
		}
		averages, overall := trial.ComputeAverages(fullTrial.Evaluations, attrs)
		var scores []ScoreItem
		for _, avg := range averages {
			scores = append(scores, ScoreItem{
				TasteAttributeID: avg.TasteAttributeID,
				Average:          avg.Average,
			})
		}
		points = append(points, ScoreTrendPoint{
			TrialID:      fullTrial.ID,
			TrialNo:      fullTrial.TrialNo,
			TrialDate:    fullTrial.TrialDate,
			VersionNo:    fullTrial.RecipeVersionNo,
			OverallScore: overall,
			Scores:       scores,
		})
	}
	return points, nil
}

