package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mookrob/backend/internal/domain/audit"
)

type AuditRepo struct {
	pool *pgxpool.Pool
}

func NewAuditRepo(pool *pgxpool.Pool) *AuditRepo {
	return &AuditRepo{pool: pool}
}

func (r *AuditRepo) Record(log *audit.AuditLog) error {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	beforeBytes, _ := json.Marshal(log.BeforeState)
	afterBytes, _ := json.Marshal(log.AfterState)

	query := `
		INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, before_state, after_state, request_id, ip, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := q.Exec(ctx, query,
		log.ID, log.ActorID, log.Action, log.EntityType, log.EntityID,
		beforeBytes, afterBytes, log.RequestID, log.IP, log.CreatedAt,
	)
	return err
}

func (r *AuditRepo) List(entityType, entityID string, actorID *uuid.UUID, limit, offset int) ([]audit.AuditLog, int, error) {
	ctx := context.Background()
	q := GetQuerier(ctx, r.pool)

	whereClause := "WHERE 1=1"
	var args []any
	argIdx := 1

	if entityType != "" {
		whereClause += fmt.Sprintf(" AND a.entity_type = $%d", argIdx)
		args = append(args, entityType)
		argIdx++
	}
	if entityID != "" {
		whereClause += fmt.Sprintf(" AND a.entity_id = $%d", argIdx)
		args = append(args, entityID)
		argIdx++
	}
	if actorID != nil {
		whereClause += fmt.Sprintf(" AND a.actor_id = $%d", argIdx)
		args = append(args, *actorID)
		argIdx++
	}

	countQuery := "SELECT COUNT(*) FROM audit_logs a " + whereClause
	var total int
	if err := q.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT a.id, a.actor_id, u.display_name, a.action, a.entity_type, a.entity_id,
		       a.before_state, a.after_state, a.request_id, a.ip, a.created_at
		FROM audit_logs a
		LEFT JOIN users u ON u.id = a.actor_id
		%s
		ORDER BY a.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := q.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []audit.AuditLog
	for rows.Next() {
		var l audit.AuditLog
		var actorID *uuid.UUID
		var actorName *string
		var beforeBytes, afterBytes []byte

		if err := rows.Scan(
			&l.ID, &actorID, &actorName, &l.Action, &l.EntityType, &l.EntityID,
			&beforeBytes, &afterBytes, &l.RequestID, &l.IP, &l.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if actorID != nil && actorName != nil {
			l.Actor = &audit.ActorRef{
				ID:          *actorID,
				DisplayName: *actorName,
			}
		}
		_ = json.Unmarshal(beforeBytes, &l.BeforeState)
		_ = json.Unmarshal(afterBytes, &l.AfterState)
		logs = append(logs, l)
	}

	return logs, total, nil
}
