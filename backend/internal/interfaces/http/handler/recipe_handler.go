package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application"
	"github.com/mookrob/backend/internal/domain/recipe"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/interfaces/http/middleware"
	"github.com/mookrob/backend/internal/interfaces/http/response"
	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type RecipeHandler struct {
	recipeService *application.RecipeService
	trialService  *application.TrialService
	cfg           *config.Config
}

func NewRecipeHandler(
	recipeService *application.RecipeService,
	trialService *application.TrialService,
	cfg *config.Config,
) *RecipeHandler {
	return &RecipeHandler{
		recipeService: recipeService,
		trialService:  trialService,
		cfg:           cfg,
	}
}

func (h *RecipeHandler) List(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	var tagID *uuid.UUID
	if t := r.URL.Query().Get("tagId"); t != "" {
		if tid, err := uuid.Parse(t); err == nil {
			tagID = &tid
		}
	}

	params := pagination.FromRequest(r, h.cfg.PaginationDefaultPageSize, h.cfg.PaginationMaxPageSize)
	paged, err := h.recipeService.List(r.Context(), status, tagID, params)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Paged(w, paged)
}

func (h *RecipeHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid recipe id"))
		return
	}

	rec, err := h.recipeService.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, rec)
}

func (h *RecipeHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	var input application.CreateRecipeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	rec, err := h.recipeService.Create(r.Context(), claims.UserID, input)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Created(w, rec)
}

type UpdateRecipeRequest struct {
	Name        string      `json:"name"`
	Description *string     `json:"description"`
	TagIDs      []uuid.UUID `json:"tagIds"`
	Version     int         `json:"version"`
}

func (h *RecipeHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid recipe id"))
		return
	}

	var req UpdateRecipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	rec, err := h.recipeService.Update(r.Context(), id, req.Name, req.Description, req.TagIDs, req.Version)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, rec)
}

func (h *RecipeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid recipe id"))
		return
	}

	if err := h.recipeService.Delete(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

type UpdateRecipeStatusRequest struct {
	Status  recipe.Status `json:"status"`
	Version int           `json:"version"`
}

func (h *RecipeHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid recipe id"))
		return
	}

	var req UpdateRecipeStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	rec, err := h.recipeService.UpdateStatus(r.Context(), claims.UserID, id, req.Status, req.Version)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, rec)
}

func (h *RecipeHandler) ListVersions(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid recipe id"))
		return
	}

	versions, err := h.recipeService.ListVersions(r.Context(), id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, versions)
}

func (h *RecipeHandler) CreateVersion(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid recipe id"))
		return
	}

	var input application.VersionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	rec, err := h.recipeService.CreateVersion(r.Context(), claims.UserID, id, input)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Created(w, rec)
}

func (h *RecipeHandler) GetVersion(w http.ResponseWriter, r *http.Request) {
	versionID, err := uuid.Parse(chi.URLParam(r, "versionId"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid version id"))
		return
	}

	ver, err := h.recipeService.GetVersion(r.Context(), versionID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, ver)
}

func (h *RecipeHandler) RestoreVersion(w http.ResponseWriter, r *http.Request) {
	recipeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid recipe id"))
		return
	}

	versionID, err := uuid.Parse(chi.URLParam(r, "versionId"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid version id"))
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	rec, err := h.recipeService.RestoreVersion(r.Context(), claims.UserID, recipeID, versionID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, rec)
}

func (h *RecipeHandler) GetScoreTrend(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid recipe id"))
		return
	}

	points, err := h.trialService.GetScoreTrend(r.Context(), id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, points)
}
