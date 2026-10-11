package handler

import (
	"encoding/json"
	"net/http"

	"github.com/mookrob/backend/internal/application"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/interfaces/http/middleware"
	"github.com/mookrob/backend/internal/interfaces/http/response"
	"github.com/mookrob/backend/pkg/apperror"
)

type AuthHandler struct {
	authService *application.AuthService
	cfg         *config.Config
}

func NewAuthHandler(authService *application.AuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		cfg:         cfg,
	}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
	Locale      string `json:"locale,omitempty"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	result, err := h.authService.Register(r.Context(), application.RegisterInput{
		Email:       req.Email,
		Password:    req.Password,
		DisplayName: req.DisplayName,
		Locale:      req.Locale,
	})
	if err != nil {
		response.Error(w, r, err)
		return
	}

	h.setRefreshCookie(w, result.RefreshToken, int(h.cfg.RefreshTokenTTLDays.Seconds()))
	response.Created(w, result)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	result, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		response.Error(w, r, err)
		return
	}

	h.setRefreshCookie(w, result.RefreshToken, int(h.cfg.RefreshTokenTTLDays.Seconds()))
	response.OK(w, result)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(h.cfg.CookieName)
	if err != nil || cookie.Value == "" {
		response.Error(w, r, apperror.Unauthenticated("missing refresh token cookie"))
		return
	}

	result, err := h.authService.Refresh(r.Context(), cookie.Value)
	if err != nil {
		h.clearRefreshCookie(w)
		response.Error(w, r, err)
		return
	}

	h.setRefreshCookie(w, result.RefreshToken, int(h.cfg.RefreshTokenTTLDays.Seconds()))
	response.OK(w, result)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, _ := r.Cookie(h.cfg.CookieName)
	rawToken := ""
	if cookie != nil {
		rawToken = cookie.Value
	}

	_ = h.authService.Logout(r.Context(), rawToken)
	h.clearRefreshCookie(w)
	response.NoContent(w)
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	me, err := h.authService.GetMe(r.Context(), claims.UserID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, me)
}

type UpdateMeRequest struct {
	DisplayName string `json:"displayName"`
	Locale      string `json:"locale"`
}

func (h *AuthHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	var req UpdateMeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	me, err := h.authService.UpdateMe(r.Context(), claims.UserID, req.DisplayName, req.Locale)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.OK(w, me)
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperror.BadRequest("invalid json payload"))
		return
	}

	if err := h.authService.ChangePassword(r.Context(), claims.UserID, req.CurrentPassword, req.NewPassword); err != nil {
		response.Error(w, r, err)
		return
	}
	response.NoContent(w)
}

func (h *AuthHandler) setRefreshCookie(w http.ResponseWriter, token string, maxAge int) {
	sameSite := http.SameSiteStrictMode
	if h.cfg.CookieSameSite == "Lax" {
		sameSite = http.SameSiteLaxMode
	} else if h.cfg.CookieSameSite == "None" {
		sameSite = http.SameSiteNoneMode
	}

	http.SetCookie(w, &http.Cookie{
		Name:     h.cfg.CookieName,
		Value:    token,
		Path:     h.cfg.CookiePath,
		Domain:   h.cfg.CookieDomain,
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: sameSite,
	})
}

func (h *AuthHandler) clearRefreshCookie(w http.ResponseWriter) {
	h.setRefreshCookie(w, "", -1)
}
