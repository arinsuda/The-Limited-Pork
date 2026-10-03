package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/domain/audit"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/interfaces/http/response"
	"github.com/mookrob/backend/pkg/pagination"
)

type OpsHandler struct {
	pool      *pgxpool.Pool
	redis     ports.RedisCache
	storage   ports.ObjectStorage
	auditRepo audit.Repository
	cfg       *config.Config
}

func NewOpsHandler(
	pool *pgxpool.Pool,
	redis ports.RedisCache,
	storage ports.ObjectStorage,
	auditRepo audit.Repository,
	cfg *config.Config,
) *OpsHandler {
	return &OpsHandler{
		pool:      pool,
		redis:     redis,
		storage:   storage,
		auditRepo: auditRepo,
		cfg:       cfg,
	}
}

func (h *OpsHandler) Healthz(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]string{"status": "ok"})
}

func (h *OpsHandler) Readyz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	checks := make(map[string]string)
	allHealthy := true

	// Check Postgres
	if err := h.pool.Ping(ctx); err != nil {
		checks["postgres"] = "failed: " + err.Error()
		allHealthy = false
	} else {
		checks["postgres"] = "ok"
	}

	// Check Redis via RateLimit or SetTicket test
	if _, _, err := h.redis.RateLimit(ctx, "health_check", 100, time.Minute); err != nil {
		checks["redis"] = "failed: " + err.Error()
		allHealthy = false
	} else {
		checks["redis"] = "ok"
	}

	// Check MinIO
	if err := h.storage.EnsureBucket(ctx); err != nil {
		checks["minio"] = "failed: " + err.Error()
		allHealthy = false
	} else {
		checks["minio"] = "ok"
	}

	status := http.StatusOK
	statusStr := "ok"
	if !allHealthy {
		status = http.StatusServiceUnavailable
		statusStr = "degraded"
	}

	response.JSON(w, status, map[string]any{
		"status": statusStr,
		"checks": checks,
	})
}

func (h *OpsHandler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	entityType := r.URL.Query().Get("entityType")
	entityID := r.URL.Query().Get("entityId")
	var actorID *uuid.UUID
	if actStr := r.URL.Query().Get("actorId"); actStr != "" {
		if aid, err := uuid.Parse(actStr); err == nil {
			actorID = &aid
		}
	}

	params := pagination.FromRequest(r, h.cfg.PaginationDefaultPageSize, h.cfg.PaginationMaxPageSize)
	logs, total, err := h.auditRepo.List(entityType, entityID, actorID, params.Limit(), params.Offset())
	if err != nil {
		response.Error(w, r, err)
		return
	}

	response.Paged(w, pagination.NewPaged(logs, params.Page, params.PageSize, total))
}
