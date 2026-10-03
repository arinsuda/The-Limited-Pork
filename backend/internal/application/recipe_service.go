package application

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/domain/attachment"
	"github.com/mookrob/backend/internal/domain/masterdata"
	"github.com/mookrob/backend/internal/domain/notification"
	"github.com/mookrob/backend/internal/domain/recipe"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type RecipeService struct {
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

func NewRecipeService(
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
) *RecipeService {
	return &RecipeService{
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

type CreateRecipeInput struct {
	Code           *string            `json:"code"`
	Name           string             `json:"name"`
	Description    *string            `json:"description"`
	TagIDs         []uuid.UUID        `json:"tagIds"`
	InitialVersion VersionInput       `json:"initialVersion"`
}

type VersionInput struct {
	ChangeNote             *string                 `json:"changeNote"`
	InputQuantity          *float64                `json:"inputQuantity"`
	InputUnitID            *uuid.UUID              `json:"inputUnitId"`
	ExpectedOutputQuantity *float64                `json:"expectedOutputQuantity"`
	ExpectedOutputUnitID   *uuid.UUID              `json:"expectedOutputUnitId"`
	Notes                  *string                 `json:"notes"`
	Ingredients            []RecipeIngredientInput `json:"ingredients"`
	Steps                  []ProcessStepInput      `json:"steps"`
}

type RecipeIngredientInput struct {
	IngredientID    uuid.UUID `json:"ingredientId"`
	Quantity        float64   `json:"quantity"`
	UnitID          uuid.UUID `json:"unitId"`
	PreparationNote *string   `json:"preparationNote"`
	IsOptional      bool      `json:"isOptional"`
}

type ProcessStepInput struct {
	StepTypeID      uuid.UUID      `json:"stepTypeId"`
	Title           *string        `json:"title"`
	Instruction     *string        `json:"instruction"`
	TemperatureC    *float64       `json:"temperatureC"`
	DurationMinutes *float64       `json:"durationMinutes"`
	OrientationID   *uuid.UUID     `json:"orientationId"`
	Params          map[string]any `json:"params"`
	Notes           *string        `json:"notes"`
}

func (s *RecipeService) List(ctx context.Context, status string, tagID *uuid.UUID, params pagination.Params) (pagination.Paged[recipe.Recipe], error) {
	list, total, err := s.recipeRepo.List(status, tagID, params.Q, params.Limit(), params.Offset())
	if err != nil {
		return pagination.Paged[recipe.Recipe]{}, err
	}

	// Populate cover URLs
	for i := range list {
		cover, err := s.attRepo.GetCover(attachment.OwnerTypeRecipe, list[i].ID)
		if err == nil && cover != nil {
			url, _ := s.storage.PresignGet(ctx, cover.ObjectKey, s.cfg.ShutdownTimeoutSeconds)
			list[i].CoverURL = &url
		}
	}

	return pagination.NewPaged(list, params.Page, params.PageSize, total), nil
}

func (s *RecipeService) GetByID(ctx context.Context, id uuid.UUID) (*recipe.Recipe, error) {
	r, err := s.recipeRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	cover, err := s.attRepo.GetCover(attachment.OwnerTypeRecipe, r.ID)
	if err == nil && cover != nil {
		url, _ := s.storage.PresignGet(ctx, cover.ObjectKey, s.cfg.ShutdownTimeoutSeconds)
		r.CoverURL = &url
	}

	return r, nil
}

func (s *RecipeService) Create(ctx context.Context, actorID uuid.UUID, input CreateRecipeInput) (*recipe.Recipe, error) {
	if input.Name == "" {
		return nil, apperror.Validation("name is required", apperror.Detail{Field: "name", Code: "required"})
	}

	// Determine code
	code := ""
	if input.Code != nil && *input.Code != "" {
		code = *input.Code
	} else {
		nextCode, err := s.recipeRepo.NextRecipeCode(s.cfg.RecipeCodePrefix)
		if err != nil {
			return nil, err
		}
		code = nextCode
	}

	recipeID := s.idGen.NewUUID()
	versionID := s.idGen.NewUUID()

	ver, err := s.buildVersion(ctx, recipeID, versionID, 1, input.InitialVersion, actorID)
	if err != nil {
		return nil, err
	}

	rec := &recipe.Recipe{
		ID:               recipeID,
		Code:             code,
		Name:             input.Name,
		Description:      input.Description,
		Status:           recipe.StatusDraft,
		CurrentVersionID: &versionID,
		CurrentVersion:   ver,
		CreatedBy:        actorID,
		Version:          1,
		CreatedAt:        s.clock.Now(),
		UpdatedAt:        s.clock.Now(),
	}

	err = s.txManager.WithTx(ctx, func(txCtx context.Context) error {
		if err := s.recipeRepo.Create(rec, ver, input.TagIDs); err != nil {
			return err
		}

		// Outbox notification
		return s.eventPublisher.PublishEvent(txCtx, string(notification.TypeRecipeCreated), ports.OutboxNotificationPayload{
			Type:     notification.TypeRecipeCreated,
			Severity: notification.SeverityInfo,
			Params: map[string]any{
				"recipeName": rec.Name,
				"recipeCode": rec.Code,
			},
			Link:     stringPtr(fmt.Sprintf("/recipes/%s", rec.ID)),
			PermCode: "recipes.read",
			ActorID:  actorID,
		})
	})

	if err != nil {
		return nil, err
	}

	s.hub.BroadcastEntityChanged("recipe", rec.ID, "created")
	return s.GetByID(ctx, rec.ID)
}

func (s *RecipeService) Update(ctx context.Context, id uuid.UUID, name string, description *string, tagIDs []uuid.UUID, version int) (*recipe.Recipe, error) {
	r, err := s.recipeRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	r.Name = name
	r.Description = description
	r.Version = version

	if err := s.recipeRepo.Update(r, tagIDs); err != nil {
		return nil, err
	}

	s.hub.BroadcastEntityChanged("recipe", id, "updated")
	return s.GetByID(ctx, id)
}

func (s *RecipeService) UpdateStatus(ctx context.Context, actorID uuid.UUID, id uuid.UUID, newStatus recipe.Status, version int) (*recipe.Recipe, error) {
	if !newStatus.IsValid() {
		return nil, apperror.Validation("invalid status")
	}

	r, err := s.recipeRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if !r.Status.CanTransitionTo(newStatus) {
		return nil, apperror.InvalidState(fmt.Sprintf("cannot transition from %s to %s", r.Status, newStatus))
	}

	err = s.txManager.WithTx(ctx, func(txCtx context.Context) error {
		if err := s.recipeRepo.UpdateStatus(id, newStatus, version); err != nil {
			return err
		}

		return s.eventPublisher.PublishEvent(txCtx, string(notification.TypeRecipeStatusChanged), ports.OutboxNotificationPayload{
			Type:     notification.TypeRecipeStatusChanged,
			Severity: notification.SeverityInfo,
			Params: map[string]any{
				"recipeName": r.Name,
				"status":     string(newStatus),
			},
			Link:     stringPtr(fmt.Sprintf("/recipes/%s", r.ID)),
			PermCode: "recipes.read",
			ActorID:  actorID,
		})
	})

	if err != nil {
		return nil, err
	}

	s.hub.BroadcastEntityChanged("recipe", id, "updated")
	return s.GetByID(ctx, id)
}

func (s *RecipeService) Delete(ctx context.Context, id uuid.UUID) error {
	if err := s.recipeRepo.Delete(id); err != nil {
		return err
	}
	s.hub.BroadcastEntityChanged("recipe", id, "deleted")
	return nil
}

func (s *RecipeService) CreateVersion(ctx context.Context, actorID uuid.UUID, recipeID uuid.UUID, input VersionInput) (*recipe.Recipe, error) {
	r, err := s.recipeRepo.GetByID(recipeID)
	if err != nil {
		return nil, err
	}

	versions, err := s.recipeRepo.ListVersions(recipeID)
	if err != nil {
		return nil, err
	}

	nextVerNo := 1
	for _, v := range versions {
		if v.VersionNo >= nextVerNo {
			nextVerNo = v.VersionNo + 1
		}
	}

	newVersionID := s.idGen.NewUUID()
	ver, err := s.buildVersion(ctx, recipeID, newVersionID, nextVerNo, input, actorID)
	if err != nil {
		return nil, err
	}

	err = s.txManager.WithTx(ctx, func(txCtx context.Context) error {
		if err := s.recipeRepo.CreateVersion(ver); err != nil {
			return err
		}

		return s.eventPublisher.PublishEvent(txCtx, string(notification.TypeRecipeVersionCreated), ports.OutboxNotificationPayload{
			Type:     notification.TypeRecipeVersionCreated,
			Severity: notification.SeverityInfo,
			Params: map[string]any{
				"recipeName": r.Name,
				"versionNo":  nextVerNo,
			},
			Link:     stringPtr(fmt.Sprintf("/recipes/%s", r.ID)),
			PermCode: "recipes.read",
			ActorID:  actorID,
		})
	})

	if err != nil {
		return nil, err
	}

	s.hub.BroadcastEntityChanged("recipe", recipeID, "updated")
	return s.GetByID(ctx, recipeID)
}

func (s *RecipeService) ListVersions(ctx context.Context, recipeID uuid.UUID) ([]recipe.Version, error) {
	return s.recipeRepo.ListVersions(recipeID)
}

func (s *RecipeService) GetVersion(ctx context.Context, versionID uuid.UUID) (*recipe.Version, error) {
	return s.recipeRepo.GetVersionByID(versionID)
}

func (s *RecipeService) RestoreVersion(ctx context.Context, actorID uuid.UUID, recipeID, versionID uuid.UUID) (*recipe.Recipe, error) {
	oldVer, err := s.recipeRepo.GetVersionByID(versionID)
	if err != nil {
		return nil, err
	}

	input := VersionInput{
		ChangeNote:             stringPtr(fmt.Sprintf("Restored from version %d", oldVer.VersionNo)),
		InputQuantity:          oldVer.InputQuantity,
		InputUnitID:            oldVer.InputUnitID,
		ExpectedOutputQuantity: oldVer.ExpectedOutputQuantity,
		ExpectedOutputUnitID:   oldVer.ExpectedOutputUnitID,
		Notes:                  oldVer.Notes,
	}

	for _, ing := range oldVer.Ingredients {
		input.Ingredients = append(input.Ingredients, RecipeIngredientInput{
			IngredientID:    ing.IngredientID,
			Quantity:        ing.Quantity,
			UnitID:          ing.UnitID,
			PreparationNote: ing.PreparationNote,
			IsOptional:      ing.IsOptional,
		})
	}

	for _, step := range oldVer.Steps {
		input.Steps = append(input.Steps, ProcessStepInput{
			StepTypeID:      step.StepTypeID,
			Title:           step.Title,
			Instruction:     step.Instruction,
			TemperatureC:    step.TemperatureC,
			DurationMinutes: step.DurationMinutes,
			OrientationID:   step.OrientationID,
			Params:          step.Params,
			Notes:           step.Notes,
		})
	}

	return s.CreateVersion(ctx, actorID, recipeID, input)
}

func (s *RecipeService) buildVersion(
	ctx context.Context,
	recipeID, versionID uuid.UUID,
	versionNo int,
	input VersionInput,
	actorID uuid.UUID,
) (*recipe.Version, error) {
	// Validate temperatures
	for i, st := range input.Steps {
		if st.TemperatureC != nil {
			if *st.TemperatureC < s.cfg.ProcessTempMinC || *st.TemperatureC > s.cfg.ProcessTempMaxC {
				return nil, apperror.Validation(
					fmt.Sprintf("temperature %.1f is out of allowed range [%.0f, %.0f]", *st.TemperatureC, s.cfg.ProcessTempMinC, s.cfg.ProcessTempMaxC),
					apperror.Detail{
						Field: fmt.Sprintf("steps[%d].temperatureC", i),
						Code:  "range",
						Param: fmt.Sprintf("%.0f-%.0f", s.cfg.ProcessTempMinC, s.cfg.ProcessTempMaxC),
					},
				)
			}
		}
	}

	// Fetch step types to compute round numbers
	stepTypes, _ := s.mdRepo.ListProcessStepTypes(true)
	stMap := make(map[uuid.UUID]masterdata.ProcessStepType)
	for _, st := range stepTypes {
		stMap[st.ID] = st
	}

	// Fetch units to calculate yield
	var inputUnit, outputUnit *masterdata.Unit
	if input.InputUnitID != nil {
		inputUnit, _ = s.mdRepo.GetUnitByID(*input.InputUnitID)
	}
	if input.ExpectedOutputUnitID != nil {
		outputUnit, _ = s.mdRepo.GetUnitByID(*input.ExpectedOutputUnitID)
	}

	var yieldPct *float64
	if input.InputQuantity != nil && input.ExpectedOutputQuantity != nil {
		yieldPct = recipe.ComputeYieldPct(*input.InputQuantity, inputUnit, *input.ExpectedOutputQuantity, outputUnit)
	}

	// Build ingredients
	var ingrs []recipe.Ingredient
	for idx, ingInput := range input.Ingredients {
		ingrs = append(ingrs, recipe.Ingredient{
			ID:              s.idGen.NewUUID(),
			VersionID:       versionID,
			LineNo:          idx + 1,
			IngredientID:    ingInput.IngredientID,
			Quantity:        ingInput.Quantity,
			UnitID:          ingInput.UnitID,
			PreparationNote: ingInput.PreparationNote,
			IsOptional:      ingInput.IsOptional,
		})
	}

	// Build steps
	var steps []recipe.Step
	for idx, stepInput := range input.Steps {
		params := stepInput.Params
		if params == nil {
			params = make(map[string]any)
		}
		steps = append(steps, recipe.Step{
			ID:              s.idGen.NewUUID(),
			VersionID:       versionID,
			StepNo:          idx + 1,
			StepTypeID:      stepInput.StepTypeID,
			Title:           stepInput.Title,
			Instruction:     stepInput.Instruction,
			TemperatureC:    stepInput.TemperatureC,
			DurationMinutes: stepInput.DurationMinutes,
			OrientationID:   stepInput.OrientationID,
			Params:          params,
			Notes:           stepInput.Notes,
		})
	}

	recipe.ComputeRoundNumbers(steps, stMap)

	return &recipe.Version{
		ID:                     versionID,
		RecipeID:               recipeID,
		VersionNo:              versionNo,
		ChangeNote:             input.ChangeNote,
		InputQuantity:          input.InputQuantity,
		InputUnitID:            input.InputUnitID,
		InputUnit:              inputUnit,
		ExpectedOutputQuantity: input.ExpectedOutputQuantity,
		ExpectedOutputUnitID:   input.ExpectedOutputUnitID,
		ExpectedOutputUnit:     outputUnit,
		ExpectedYieldPct:       yieldPct,
		Notes:                  input.Notes,
		Ingredients:            ingrs,
		Steps:                  steps,
		CreatedBy:              actorID,
		CreatedAt:              s.clock.Now(),
	}, nil
}

func stringPtr(s string) *string {
	return &s
}
