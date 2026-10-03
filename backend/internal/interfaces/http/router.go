package http

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/interfaces/http/handler"
	"github.com/mookrob/backend/internal/interfaces/http/middleware"
)

type Handlers struct {
	Auth         *handler.AuthHandler
	User         *handler.UserHandler
	MasterData   *handler.MasterDataHandler
	Recipe       *handler.RecipeHandler
	Trial        *handler.TrialHandler
	Attachment   *handler.AttachmentHandler
	Notification *handler.NotificationHandler
	Ops          *handler.OpsHandler
}

func NewRouter(
	cfg *config.Config,
	tokenIssuer ports.TokenIssuer,
	cache ports.RedisCache,
	h Handlers,
) http.Handler {
	r := chi.NewRouter()

	// Base middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "Accept-Language"},
		ExposedHeaders:   []string{"X-Request-ID", "X-RateLimit-Remaining"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Ops endpoints (unauthenticated)
	r.Get("/healthz", h.Ops.Healthz)
	r.Get("/readyz", h.Ops.Readyz)

	// WebSocket upgrade with ticket
	r.Get("/ws", h.Notification.HandleWebSocket)

	// API v1
	r.Route("/api/v1", func(v1 chi.Router) {
		// Health check on v1 as well
		v1.Get("/healthz", h.Ops.Healthz)
		v1.Get("/readyz", h.Ops.Readyz)

		// Auth public endpoints
		v1.Route("/auth", func(auth chi.Router) {
			auth.With(middleware.RateLimit(cache, cfg.RateLimitLoginPerMin, time.Minute)).
				Post("/login", h.Auth.Login)
			auth.Post("/refresh", h.Auth.Refresh)

			// Auth protected endpoints
			auth.Group(func(authProtected chi.Router) {
				authProtected.Use(middleware.Auth(tokenIssuer))
				authProtected.Post("/logout", h.Auth.Logout)
				authProtected.Get("/me", h.Auth.GetMe)
				authProtected.Put("/me", h.Auth.UpdateMe)
				authProtected.Post("/me/password", h.Auth.ChangePassword)
			})
		})

		// WebSocket ticket (auth required)
		v1.Group(func(wsTicket chi.Router) {
			wsTicket.Use(middleware.Auth(tokenIssuer))
			wsTicket.Post("/ws/ticket", h.Notification.GenerateWSTicket)
		})

		// Protected endpoints
		v1.Group(func(protected chi.Router) {
			protected.Use(middleware.Auth(tokenIssuer))

			// Settings public
			protected.Get("/settings/public", h.MasterData.ListPublicSettings)

			// Notifications
			protected.Get("/notifications", h.Notification.List)
			protected.Get("/notifications/unread-count", h.Notification.GetUnreadCount)
			protected.Post("/notifications/{id}/read", h.Notification.MarkAsRead)
			protected.Post("/notifications/read-all", h.Notification.MarkAllAsRead)

			// Users & Roles
			protected.Route("/users", func(users chi.Router) {
				users.With(middleware.RequirePermission("users.read")).Get("/", h.User.List)
				users.With(middleware.RequirePermission("users.write")).Post("/", h.User.Create)
				users.With(middleware.RequirePermission("users.read")).Get("/{id}", h.User.GetByID)
				users.With(middleware.RequirePermission("users.write")).Put("/{id}", h.User.Update)
				users.With(middleware.RequirePermission("users.write")).Post("/{id}/reset-password", h.User.ResetPassword)
			})
			protected.Route("/roles", func(roles chi.Router) {
				roles.With(middleware.RequirePermission("users.read")).Get("/", h.User.ListRoles)
				roles.With(middleware.RequirePermission("users.write")).Put("/{id}/permissions", h.User.UpdateRolePermissions)
			})
			protected.With(middleware.RequirePermission("users.read")).Get("/permissions", h.User.ListPermissions)

			// Master Data: Units
			protected.Route("/units", func(units chi.Router) {
				units.With(middleware.RequirePermission("masterdata.read")).Get("/", h.MasterData.ListUnits)
				units.With(middleware.RequirePermission("masterdata.write")).Post("/", h.MasterData.CreateUnit)
				units.With(middleware.RequirePermission("masterdata.read")).Get("/{id}", h.MasterData.GetUnit)
				units.With(middleware.RequirePermission("masterdata.write")).Put("/{id}", h.MasterData.UpdateUnit)
				units.With(middleware.RequirePermission("masterdata.write")).Delete("/{id}", h.MasterData.DeleteUnit)
			})

			// Master Data: Taste Attributes
			protected.Route("/taste-attributes", func(ta chi.Router) {
				ta.With(middleware.RequirePermission("masterdata.read")).Get("/", h.MasterData.ListTasteAttributes)
				ta.With(middleware.RequirePermission("masterdata.write")).Post("/", h.MasterData.CreateTasteAttribute)
				ta.With(middleware.RequirePermission("masterdata.read")).Get("/{id}", h.MasterData.GetTasteAttribute)
				ta.With(middleware.RequirePermission("masterdata.write")).Put("/{id}", h.MasterData.UpdateTasteAttribute)
				ta.With(middleware.RequirePermission("masterdata.write")).Delete("/{id}", h.MasterData.DeleteTasteAttribute)
			})

			// Master Data: Process Step Types
			protected.Route("/process-step-types", func(pst chi.Router) {
				pst.With(middleware.RequirePermission("masterdata.read")).Get("/", h.MasterData.ListProcessStepTypes)
				pst.With(middleware.RequirePermission("masterdata.write")).Post("/", h.MasterData.CreateProcessStepType)
				pst.With(middleware.RequirePermission("masterdata.read")).Get("/{id}", h.MasterData.GetProcessStepType)
				pst.With(middleware.RequirePermission("masterdata.write")).Put("/{id}", h.MasterData.UpdateProcessStepType)
				pst.With(middleware.RequirePermission("masterdata.write")).Delete("/{id}", h.MasterData.DeleteProcessStepType)
			})

			// Master Data: Lookups
			protected.With(middleware.RequirePermission("masterdata.read")).Get("/lookup-categories", h.MasterData.ListLookupCategories)
			protected.Route("/lookups", func(l chi.Router) {
				l.With(middleware.RequirePermission("masterdata.read")).Get("/", h.MasterData.ListLookups)
				l.With(middleware.RequirePermission("masterdata.write")).Post("/", h.MasterData.CreateLookup)
				l.With(middleware.RequirePermission("masterdata.write")).Put("/{id}", h.MasterData.UpdateLookup)
				l.With(middleware.RequirePermission("masterdata.write")).Delete("/{id}", h.MasterData.DeleteLookup)
			})

			// Master Data: Ingredients
			protected.Route("/ingredients", func(ing chi.Router) {
				ing.With(middleware.RequirePermission("masterdata.read")).Get("/", h.MasterData.ListIngredients)
				ing.With(middleware.RequirePermission("masterdata.write")).Post("/", h.MasterData.CreateIngredient)
				ing.With(middleware.RequirePermission("masterdata.read")).Get("/{id}", h.MasterData.GetIngredient)
				ing.With(middleware.RequirePermission("masterdata.write")).Put("/{id}", h.MasterData.UpdateIngredient)
				ing.With(middleware.RequirePermission("masterdata.write")).Delete("/{id}", h.MasterData.DeleteIngredient)
			})

			// Master Data: Settings
			protected.Route("/settings", func(s chi.Router) {
				s.With(middleware.RequirePermission("settings.read")).Get("/", h.MasterData.ListSettings)
				s.With(middleware.RequirePermission("settings.write")).Put("/{key}", h.MasterData.UpdateSetting)
			})

			// Recipes
			protected.Route("/recipes", func(rec chi.Router) {
				rec.With(middleware.RequirePermission("recipes.read")).Get("/", h.Recipe.List)
				rec.With(middleware.RequirePermission("recipes.write")).Post("/", h.Recipe.Create)
				rec.With(middleware.RequirePermission("recipes.read")).Get("/{id}", h.Recipe.GetByID)
				rec.With(middleware.RequirePermission("recipes.write")).Put("/{id}", h.Recipe.Update)
				rec.With(middleware.RequirePermission("recipes.write")).Delete("/{id}", h.Recipe.Delete)
				rec.With(middleware.RequirePermission("recipes.write")).Post("/{id}/status", h.Recipe.UpdateStatus)
				rec.With(middleware.RequirePermission("recipes.read")).Get("/{id}/versions", h.Recipe.ListVersions)
				rec.With(middleware.RequirePermission("recipes.write")).Post("/{id}/versions", h.Recipe.CreateVersion)
				rec.With(middleware.RequirePermission("recipes.read")).Get("/{id}/versions/{versionId}", h.Recipe.GetVersion)
				rec.With(middleware.RequirePermission("recipes.write")).Post("/{id}/versions/{versionId}/restore", h.Recipe.RestoreVersion)
				rec.With(middleware.RequirePermission("recipes.read")).Get("/{id}/score-trend", h.Recipe.GetScoreTrend)
			})

			// Trials
			protected.Route("/trials", func(tr chi.Router) {
				tr.With(middleware.RequirePermission("trials.read")).Get("/", h.Trial.List)
				tr.With(middleware.RequirePermission("trials.write")).Post("/", h.Trial.Create)
				tr.With(middleware.RequirePermission("trials.read")).Get("/compare", h.Trial.CompareTrials)
				tr.With(middleware.RequirePermission("trials.read")).Get("/{id}", h.Trial.GetByID)
				tr.With(middleware.RequirePermission("trials.write")).Put("/{id}", h.Trial.Update)
				tr.With(middleware.RequirePermission("trials.write")).Delete("/{id}", h.Trial.Delete)
				tr.With(middleware.RequirePermission("trials.write")).Post("/{id}/outcome", h.Trial.UpdateOutcome)
				tr.With(middleware.RequirePermission("trials.evaluate")).Post("/{id}/evaluations", h.Trial.AddEvaluation)
				tr.With(middleware.RequirePermission("trials.write")).Delete("/{id}/evaluations/{evaluationId}", h.Trial.DeleteEvaluation)
			})

			// Attachments
			protected.Route("/attachments", func(att chi.Router) {
				att.With(middleware.RequirePermission("files.upload")).Post("/", h.Attachment.Upload)
				att.Get("/", h.Attachment.List)
				att.With(middleware.RequirePermission("files.upload")).Patch("/{id}", h.Attachment.Update)
				att.With(middleware.RequirePermission("files.upload")).Delete("/{id}", h.Attachment.Delete)
			})

			// Audit logs
			protected.With(middleware.RequirePermission("audit.read")).Get("/audit-logs", h.Ops.ListAuditLogs)
		})
	})

	return r
}
