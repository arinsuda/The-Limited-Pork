package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mookrob/backend/internal/domain/notification"
)

type NotificationRepo struct {
	pool *pgxpool.Pool
}

func NewNotificationRepo(pool *pgxpool.Pool) *NotificationRepo {
	return &NotificationRepo{pool: pool}
}

func (r *NotificationRepo) List(userID uuid.UUID, unreadOnly bool, limit, offset int) ([]notification.Notification, int, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	whereClause := "WHERE user_id = $1"
	if unreadOnly {
		whereClause += " AND read_at IS NULL"
	}

	countQuery := "SELECT COUNT(*) FROM notifications " + whereClause
	var total int
	if err := q.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT id, type, severity, params, link, read_at, created_at
		FROM notifications
		%s
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, whereClause)

	rows, err := q.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []notification.Notification
	for rows.Next() {
		var n notification.Notification
		var paramsBytes []byte
		if err := rows.Scan(&n.ID, &n.Type, &n.Severity, &paramsBytes, &n.Link, &n.ReadAt, &n.CreatedAt); err != nil {
			return nil, 0, err
		}
		_ = json.Unmarshal(paramsBytes, &n.Params)
		list = append(list, n)
	}

	return list, total, nil
}

func (r *NotificationRepo) GetUnreadCount(userID uuid.UUID) (int, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	var count int
	err := q.QueryRow(ctx, `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL`, userID).Scan(&count)
	return count, err
}

func (r *NotificationRepo) MarkAsRead(id, userID uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	_, err := q.Exec(ctx, `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *NotificationRepo) MarkAllAsRead(userID uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	_, err := q.Exec(ctx, `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`, userID)
	return err
}

func (r *NotificationRepo) CreateMany(notifications []notification.Notification) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	for _, n := range notifications {
		paramsBytes, _ := json.Marshal(n.Params)
		_, err := q.Exec(ctx, `
			INSERT INTO notifications (id, user_id, type, severity, params, link, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, n.ID, n.UserID, n.Type, n.Severity, paramsBytes, n.Link, n.CreatedAt)
		if err != nil {
			return err
		}
	}
	return nil
}

// ---- Outbox ----

func (r *NotificationRepo) SaveOutboxEvent(event *notification.OutboxEvent) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `INSERT INTO outbox_events (id, event_type, payload, created_at) VALUES ($1, $2, $3, $4)`
	_, err := q.Exec(ctx, query, event.ID, event.EventType, event.Payload, event.CreatedAt)
	return err
}

func (r *NotificationRepo) FetchUnprocessedEvents(limit int) ([]notification.OutboxEvent, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	query := `
		SELECT id, event_type, payload, created_at, processed_at
		FROM outbox_events
		WHERE processed_at IS NULL
		ORDER BY created_at ASC
		LIMIT $1
	`
	rows, err := q.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []notification.OutboxEvent
	for rows.Next() {
		var e notification.OutboxEvent
		if err := rows.Scan(&e.ID, &e.EventType, &e.Payload, &e.CreatedAt, &e.ProcessedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}

func (r *NotificationRepo) MarkEventProcessed(id uuid.UUID) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	now := time.Now().UTC()
	_, err := q.Exec(ctx, `UPDATE outbox_events SET processed_at = $1 WHERE id = $2`, now, id)
	return err
}
