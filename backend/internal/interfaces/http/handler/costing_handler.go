package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application"
	"github.com/mookrob/backend/internal/domain/costing"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/interfaces/http/middleware"
	"github.com/mookrob/backend/internal/interfaces/http/response"
	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type CostingHandler struct {
	costingService *application.CostingService
	cfg            *config.Config
}

func NewCostingHandler(costingService *application.CostingService, cfg *config.Config) *CostingHandler {
	return &CostingHandler{
		costingService: costingService,
		cfg:            cfg,
	}
}

func (h *CostingHandler) List(w http.ResponseWriter, r *http.Request) {
	var recipeID *uuid.UUID
	if recStr := r.URL.Query().Get("recipeId"); recStr != "" {
		if id, err := uuid.Parse(recStr); err == nil {
			recipeID = &id
		}
	}

	filter := costing.ListFilter{
		Search:   r.URL.Query().Get("q"),
		RecipeID: recipeID,
	}

	params := pagination.FromRequest(r, h.cfg.PaginationDefaultPageSize, h.cfg.PaginationMaxPageSize)
	paged, err := h.costingService.List(r.Context(), filter, params)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Paged(w, *paged)
}

func (h *CostingHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid costing id"))
		return
	}

	calc, err := h.costingService.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, calc)
}

func (h *CostingHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	var input application.CostingInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	calc, err := h.costingService.Create(r.Context(), claims.UserID, input)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Created(w, calc)
}

func (h *CostingHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid costing id"))
		return
	}

	var input application.CostingInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	calc, err := h.costingService.Update(r.Context(), id, input)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, calc)
}

func (h *CostingHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid costing id"))
		return
	}

	if err := h.costingService.Delete(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

func (h *CostingHandler) Simulate(w http.ResponseWriter, r *http.Request) {
	var input application.CostingInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	calc := h.costingService.Simulate(input)
	response.OK(w, calc)
}

func (h *CostingHandler) GetRecipeTemplate(w http.ResponseWriter, r *http.Request) {
	recipeID, err := uuid.Parse(chi.URLParam(r, "recipeId"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid recipe id"))
		return
	}

	calc, err := h.costingService.GetRecipeTemplate(r.Context(), recipeID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, calc)
}
