package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application"
	"github.com/mookrob/backend/internal/domain/trial"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/interfaces/http/middleware"
	"github.com/mookrob/backend/internal/interfaces/http/response"
	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type TrialHandler struct {
	trialService *application.TrialService
	cfg          *config.Config
}

func NewTrialHandler(trialService *application.TrialService, cfg *config.Config) *TrialHandler {
	return &TrialHandler{
		trialService: trialService,
		cfg:          cfg,
	}
}

func (h *TrialHandler) List(w http.ResponseWriter, r *http.Request) {
	var recipeID *uuid.UUID
	if recStr := r.URL.Query().Get("recipeId"); recStr != "" {
		if rid, err := uuid.Parse(recStr); err == nil {
			recipeID = &rid
		}
	}

	outcome := r.URL.Query().Get("outcome")

	var dateFrom, dateTo *string
	if df := r.URL.Query().Get("dateFrom"); df != "" {
		dateFrom = &df
	}
	if dt := r.URL.Query().Get("dateTo"); dt != "" {
		dateTo = &dt
	}

	params := pagination.FromRequest(r, h.cfg.PaginationDefaultPageSize, h.cfg.PaginationMaxPageSize)
	paged, err := h.trialService.List(r.Context(), recipeID, outcome, dateFrom, dateTo, params)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Paged(w, paged)
}

func (h *TrialHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid trial id"))
		return
	}

	t, err := h.trialService.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, t)
}

func (h *TrialHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input application.CreateTrialInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	t, err := h.trialService.Create(r.Context(), claims.UserID, input)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Created(w, t)
}

func (h *TrialHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid trial id"))
		return
	}

	var input application.UpdateTrialInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	t, err := h.trialService.Update(r.Context(), id, input)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, t)
}

func (h *TrialHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid trial id"))
		return
	}

	if err := h.trialService.Delete(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

type UpdateTrialOutcomeRequest struct {
	Outcome trial.Outcome `json:"outcome"`
	Version int           `json:"version"`
}

func (h *TrialHandler) UpdateOutcome(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid trial id"))
		return
	}

	var req UpdateTrialOutcomeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	t, err := h.trialService.UpdateOutcome(r.Context(), claims.UserID, id, req.Outcome, req.Version)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, t)
}

func (h *TrialHandler) AddEvaluation(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid trial id"))
		return
	}

	var input application.EvaluationInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	t, err := h.trialService.AddEvaluation(r.Context(), claims.UserID, id, input)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Created(w, t)
}

func (h *TrialHandler) DeleteEvaluation(w http.ResponseWriter, r *http.Request) {
	trialID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid trial id"))
		return
	}

	evaluationID, err := uuid.Parse(chi.URLParam(r, "evaluationId"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid evaluation id"))
		return
	}

	t, err := h.trialService.DeleteEvaluation(r.Context(), trialID, evaluationID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, t)
}

func (h *TrialHandler) CompareTrials(w http.ResponseWriter, r *http.Request) {
	idsStr := r.URL.Query().Get("ids")
	if idsStr == "" {
		response.Error(w, r, apperror.BadRequest("ids query parameter is required"))
		return
	}

	rawIDs := strings.Split(idsStr, ",")
	var trialIDs []uuid.UUID
	for _, raw := range rawIDs {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		id, err := uuid.Parse(trimmed)
		if err != nil {
			response.Error(w, r, apperror.BadRequest("invalid trial id in list: "+trimmed))
			return
		}
		trialIDs = append(trialIDs, id)
	}

	result, err := h.trialService.CompareTrials(r.Context(), trialIDs)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, result)
}
