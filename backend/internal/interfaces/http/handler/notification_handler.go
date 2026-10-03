package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/infrastructure/config"
	wsHub "github.com/mookrob/backend/internal/infrastructure/realtime/websocket"
	"github.com/mookrob/backend/internal/interfaces/http/middleware"
	"github.com/mookrob/backend/internal/interfaces/http/response"
	"github.com/mookrob/backend/pkg/apperror"
	"github.com/mookrob/backend/pkg/pagination"
)

type NotificationHandler struct {
	notifService *application.NotificationService
	hub          *wsHub.Hub
	cache        ports.RedisCache
	cfg          *config.Config
}

func NewNotificationHandler(
	notifService *application.NotificationService,
	hub *wsHub.Hub,
	cache ports.RedisCache,
	cfg *config.Config,
) *NotificationHandler {
	return &NotificationHandler{
		notifService: notifService,
		hub:          hub,
		cache:        cache,
		cfg:          cfg,
	}
}

func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	unreadOnly := r.URL.Query().Get("unreadOnly") == "true"
	params := pagination.FromRequest(r, h.cfg.PaginationDefaultPageSize, h.cfg.PaginationMaxPageSize)

	paged, err := h.notifService.List(r.Context(), claims.UserID, unreadOnly, params)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.Paged(w, paged)
}

func (h *NotificationHandler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	count, err := h.notifService.GetUnreadCount(r.Context(), claims.UserID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, map[string]int{"count": count})
}

func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, r, apperror.BadRequest("invalid notification id"))
		return
	}

	if err := h.notifService.MarkAsRead(r.Context(), id, claims.UserID); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

func (h *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	if err := h.notifService.MarkAllAsRead(r.Context(), claims.UserID); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

func (h *NotificationHandler) GenerateWSTicket(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	ticket, err := h.notifService.GenerateWSTicket(r.Context(), claims.UserID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, ticket)
}

func (h *NotificationHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	ticket := r.URL.Query().Get("ticket")
	if ticket == "" {
		response.Error(w, r, apperror.Unauthenticated("ticket query parameter is required"))
		return
	}

	userID, err := h.cache.GetAndConsumeTicket(r.Context(), ticket)
	if err != nil {
		response.Error(w, r, apperror.Unauthenticated("invalid or expired websocket ticket"))
		return
	}

	h.hub.HandleWS(w, r, userID)
}
