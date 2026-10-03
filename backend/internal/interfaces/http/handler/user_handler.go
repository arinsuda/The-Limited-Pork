package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/interfaces/http/response"
	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type UserHandler struct {
	userService *application.UserService
	cfg         *config.Config
}

func NewUserHandler(userService *application.UserService, cfg *config.Config) *UserHandler {
	return &UserHandler{
		userService: userService,
		cfg:         cfg,
	}
}

func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r, h.cfg.PaginationDefaultPageSize, h.cfg.PaginationMaxPageSize)
	paged, err := h.userService.List(r.Context(), params)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Paged(w, paged)
}

func (h *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid user id"))
		return
	}

	u, err := h.userService.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, u)
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input application.CreateUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	u, err := h.userService.Create(r.Context(), input)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Created(w, u)
}

func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid user id"))
		return
	}

	var input application.UpdateUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	u, err := h.userService.Update(r.Context(), id, input)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, u)
}

type ResetPasswordRequest struct {
	NewPassword string `json:"newPassword"`
}

func (h *UserHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid user id"))
		return
	}

	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	if err := h.userService.ResetPassword(r.Context(), id, req.NewPassword); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

func (h *UserHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := h.userService.ListRoles(r.Context())
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, roles)
}

type UpdateRolePermissionsRequest struct {
	PermissionCodes []string `json:"permissionCodes"`
}

func (h *UserHandler) UpdateRolePermissions(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid role id"))
		return
	}

	var req UpdateRolePermissionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	role, err := h.userService.UpdateRolePermissions(r.Context(), id, req.PermissionCodes)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, role)
}

func (h *UserHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	perms, err := h.userService.ListPermissions(r.Context())
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, perms)
}
