package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application"
	"github.com/mookrob/backend/internal/domain/masterdata"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/interfaces/http/response"
	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type MasterDataHandler struct {
	mdService *application.MasterDataService
	cfg       *config.Config
}

func NewMasterDataHandler(mdService *application.MasterDataService, cfg *config.Config) *MasterDataHandler {
	return &MasterDataHandler{
		mdService: mdService,
		cfg:       cfg,
	}
}

// --- Units ---

func (h *MasterDataHandler) ListUnits(w http.ResponseWriter, r *http.Request) {
	includeInactive := r.URL.Query().Get("includeInactive") == "true"
	units, err := h.mdService.ListUnits(r.Context(), includeInactive)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, units)
}

func (h *MasterDataHandler) GetUnit(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid unit id"))
		return
	}

	u, err := h.mdService.GetUnit(r.Context(), id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, u)
}

func (h *MasterDataHandler) CreateUnit(w http.ResponseWriter, r *http.Request) {
	var u masterdata.Unit
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	if err := h.mdService.CreateUnit(r.Context(), &u); err != nil {
		response.Error(w, r, err)
		return
	}
	response.Created(w, u)
}

func (h *MasterDataHandler) UpdateUnit(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid unit id"))
		return
	}

	var u masterdata.Unit
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}
	u.ID = id

	if err := h.mdService.UpdateUnit(r.Context(), &u); err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, u)
}

func (h *MasterDataHandler) DeleteUnit(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid unit id"))
		return
	}

	if err := h.mdService.DeleteUnit(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

// --- Taste Attributes ---

func (h *MasterDataHandler) ListTasteAttributes(w http.ResponseWriter, r *http.Request) {
	includeInactive := r.URL.Query().Get("includeInactive") == "true"
	attrs, err := h.mdService.ListTasteAttributes(r.Context(), includeInactive)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, attrs)
}

func (h *MasterDataHandler) GetTasteAttribute(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid taste attribute id"))
		return
	}

	attr, err := h.mdService.GetTasteAttribute(r.Context(), id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, attr)
}

func (h *MasterDataHandler) CreateTasteAttribute(w http.ResponseWriter, r *http.Request) {
	var attr masterdata.TasteAttribute
	if err := json.NewDecoder(r.Body).Decode(&attr); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	if err := h.mdService.CreateTasteAttribute(&attr); err != nil {
		response.Error(w, r, err)
		return
	}
	response.Created(w, attr)
}

func (h *MasterDataHandler) UpdateTasteAttribute(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid taste attribute id"))
		return
	}

	var attr masterdata.TasteAttribute
	if err := json.NewDecoder(r.Body).Decode(&attr); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}
	attr.ID = id

	if err := h.mdService.UpdateTasteAttribute(&attr); err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, attr)
}

func (h *MasterDataHandler) DeleteTasteAttribute(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid taste attribute id"))
		return
	}

	if err := h.mdService.DeleteTasteAttribute(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

// --- Process Step Types ---

func (h *MasterDataHandler) ListProcessStepTypes(w http.ResponseWriter, r *http.Request) {
	includeInactive := r.URL.Query().Get("includeInactive") == "true"
	types, err := h.mdService.ListProcessStepTypes(r.Context(), includeInactive)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, types)
}

func (h *MasterDataHandler) GetProcessStepType(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid process step type id"))
		return
	}

	pst, err := h.mdService.GetProcessStepType(r.Context(), id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, pst)
}

func (h *MasterDataHandler) CreateProcessStepType(w http.ResponseWriter, r *http.Request) {
	var pst masterdata.ProcessStepType
	if err := json.NewDecoder(r.Body).Decode(&pst); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	if err := h.mdService.CreateProcessStepType(&pst); err != nil {
		response.Error(w, r, err)
		return
	}
	response.Created(w, pst)
}

func (h *MasterDataHandler) UpdateProcessStepType(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid process step type id"))
		return
	}

	var pst masterdata.ProcessStepType
	if err := json.NewDecoder(r.Body).Decode(&pst); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}
	pst.ID = id

	if err := h.mdService.UpdateProcessStepType(&pst); err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, pst)
}

func (h *MasterDataHandler) DeleteProcessStepType(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid process step type id"))
		return
	}

	if err := h.mdService.DeleteProcessStepType(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

// --- Lookups ---

func (h *MasterDataHandler) ListLookupCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.mdService.ListLookupCategories(r.Context())
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, cats)
}

func (h *MasterDataHandler) ListLookups(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	includeInactive := r.URL.Query().Get("includeInactive") == "true"

	lookups, err := h.mdService.ListLookups(r.Context(), category, includeInactive)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, lookups)
}

func (h *MasterDataHandler) CreateLookup(w http.ResponseWriter, r *http.Request) {
	var l masterdata.Lookup
	if err := json.NewDecoder(r.Body).Decode(&l); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	if err := h.mdService.CreateLookup(r.Context(), &l); err != nil {
		response.Error(w, r, err)
		return
	}
	response.Created(w, l)
}

func (h *MasterDataHandler) UpdateLookup(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid lookup id"))
		return
	}

	var l masterdata.Lookup
	if err := json.NewDecoder(r.Body).Decode(&l); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}
	l.ID = id

	if err := h.mdService.UpdateLookup(r.Context(), &l); err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, l)
}

func (h *MasterDataHandler) DeleteLookup(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid lookup id"))
		return
	}

	if err := h.mdService.DeleteLookup(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

// --- Ingredients ---

func (h *MasterDataHandler) ListIngredients(w http.ResponseWriter, r *http.Request) {
	includeInactive := r.URL.Query().Get("includeInactive") == "true"
	var categoryID *uuid.UUID
	if catStr := r.URL.Query().Get("categoryId"); catStr != "" {
		if cid, err := uuid.Parse(catStr); err == nil {
			categoryID = &cid
		}
	}

	params := pagination.FromRequest(r, h.cfg.PaginationDefaultPageSize, h.cfg.PaginationMaxPageSize)
	paged, err := h.mdService.ListIngredients(r.Context(), categoryID, includeInactive, params)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Paged(w, paged)
}

func (h *MasterDataHandler) GetIngredient(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid ingredient id"))
		return
	}

	ing, err := h.mdService.GetIngredient(r.Context(), id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, ing)
}

func (h *MasterDataHandler) CreateIngredient(w http.ResponseWriter, r *http.Request) {
	var ing masterdata.Ingredient
	if err := json.NewDecoder(r.Body).Decode(&ing); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	if err := h.mdService.CreateIngredient(r.Context(), &ing); err != nil {
		response.Error(w, r, err)
		return
	}
	response.Created(w, ing)
}

func (h *MasterDataHandler) UpdateIngredient(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid ingredient id"))
		return
	}

	var ing masterdata.Ingredient
	if err := json.NewDecoder(r.Body).Decode(&ing); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}
	ing.ID = id

	if err := h.mdService.UpdateIngredient(r.Context(), &ing); err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, ing)
}

func (h *MasterDataHandler) DeleteIngredient(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid ingredient id"))
		return
	}

	if err := h.mdService.DeleteIngredient(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

// --- Settings ---

func (h *MasterDataHandler) ListSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.mdService.ListSettings(r.Context(), false)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, settings)
}

func (h *MasterDataHandler) ListPublicSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.mdService.ListSettings(r.Context(), true)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, settings)
}

type UpdateSettingRequest struct {
	Value   any `json:"value"`
	Version int `json:"version"`
}

func (h *MasterDataHandler) UpdateSetting(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	if key == "" {
		response.Error(w, r, apperror.BadRequest("setting key is required"))
		return
	}

	var req UpdateSettingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	s, err := h.mdService.UpdateSetting(r.Context(), key, req.Value, req.Version)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, s)
}
