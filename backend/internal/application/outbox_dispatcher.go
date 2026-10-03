package application

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/domain/notification"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/infrastructure/persistence/postgres"
)

type OutboxDispatcher struct {
	pool       *pgxpool.Pool
	outboxRepo notification.Repository
	hub        ports.WebSocketHub
	clock      ports.Clock
	idGen      ports.IDGen
	cfg        *config.Config
}

func NewOutboxDispatcher(
	pool *pgxpool.Pool,
	outboxRepo notification.Repository,
	hub ports.WebSocketHub,
	clock ports.Clock,
	idGen ports.IDGen,
	cfg *config.Config,
) *OutboxDispatcher {
	return &OutboxDispatcher{
		pool:       pool,
		outboxRepo: outboxRepo,
		hub:        hub,
		clock:      clock,
		idGen:      idGen,
		cfg:        cfg,
	}
}

func (d *OutboxDispatcher) PublishEvent(ctx context.Context, eventType string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	event := &notification.OutboxEvent{
		ID:        d.idGen.NewUUID(),
		EventType: eventType,
		Payload:   data,
		CreatedAt: d.clock.Now(),
	}

	return d.outboxRepo.SaveOutboxEvent(event)
}

func (d *OutboxDispatcher) Start(ctx context.Context) {
	ticker := time.NewTicker(d.cfg.OutboxPollIntervalMS)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			_, err := d.DispatchOutbox(ctx)
			if err != nil {
				slog.Error("outbox dispatch error", "error", err)
			}
		}
	}
}

func (d *OutboxDispatcher) DispatchOutbox(ctx context.Context) (int, error) {
	events, err := d.outboxRepo.FetchUnprocessedEvents(d.cfg.OutboxBatchSize)
	if err != nil {
		return 0, err
	}

	count := 0
	for _, ev := range events {
		var payload ports.OutboxNotificationPayload
		if err := json.Unmarshal(ev.Payload, &payload); err != nil {
			slog.Warn("malformed outbox payload", "eventId", ev.ID, "error", err)
			_ = d.outboxRepo.MarkEventProcessed(ev.ID)
			continue
		}

		// Find users with required permission excluding the actor
		recipientIDs, err := d.findUsersWithPermission(ctx, payload.PermCode, payload.ActorID)
		if err == nil && len(recipientIDs) > 0 {
			var notifications []notification.Notification
			now := d.clock.Now()

			for _, uid := range recipientIDs {
				n := notification.Notification{
					ID:        d.idGen.NewUUID(),
					UserID:    uid,
					Type:      payload.Type,
					Severity:  payload.Severity,
					Params:    payload.Params,
					Link:      payload.Link,
					ReadAt:    nil,
					CreatedAt: now,
				}
				notifications = append(notifications, n)
			}

			if err := d.outboxRepo.CreateMany(notifications); err == nil {
				// Fan-out to connected clients
				for _, n := range notifications {
					d.hub.SendToUser(n.UserID, map[string]any{
						"type": "notification",
						"data": n,
					})
				}
			}
		}

		_ = d.outboxRepo.MarkEventProcessed(ev.ID)
		count++
	}

	return count, nil
}

func (d *OutboxDispatcher) findUsersWithPermission(ctx context.Context, permCode string, excludeActorID uuid.UUID) ([]uuid.UUID, error) {
	q := postgres.GetQuerier(ctx, d.pool)
	query := `
		SELECT DISTINCT u.id
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id
		JOIN role_permissions rp ON rp.role_id = ur.role_id
		WHERE rp.permission_code = $1 AND u.id != $2 AND u.is_active = true AND u.deleted_at IS NULL
	`
	rows, err := q.Query(ctx, query, permCode, excludeActorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var uids []uuid.UUID
	for rows.Next() {
		var uid uuid.UUID
		if err := rows.Scan(&uid); err == nil {
			uids = append(uids, uid)
		}
	}
	return uids, nil
}
