package audit

import (
	"time"

	"github.com/google/uuid"
)

type ActorRef struct {
	ID          uuid.UUID `json:"id"`
	DisplayName string    `json:"displayName"`
}

type AuditLog struct {
	ID          uuid.UUID `json:"id"`
	ActorID     *uuid.UUID `json:"-"`
	Actor       *ActorRef `json:"actor"`
	Action      string    `json:"action"`
	EntityType  string    `json:"entityType"`
	EntityID    string    `json:"entityId"`
	BeforeState any       `json:"before"`
	AfterState  any       `json:"after"`
	RequestID   *string   `json:"requestId"`
	IP          *string   `json:"ip"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Repository interface {
	Record(log *AuditLog) error
	List(entityType, entityID string, actorID *uuid.UUID, limit, offset int) ([]AuditLog, int, error)
}
