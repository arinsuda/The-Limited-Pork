package notification

import (
	"time"

	"github.com/google/uuid"
)

type Type string

const (
	TypeRecipeCreated        Type = "RECIPE_CREATED"
	TypeRecipeVersionCreated Type = "RECIPE_VERSION_CREATED"
	TypeRecipeStatusChanged  Type = "RECIPE_STATUS_CHANGED"
	TypeTrialCreated         Type = "TRIAL_CREATED"
	TypeTrialEvaluated       Type = "TRIAL_EVALUATED"
	TypeTrialOutcomeChanged  Type = "TRIAL_OUTCOME_CHANGED"
)

type Severity string

const (
	SeverityInfo    Severity = "INFO"
	SeveritySuccess Severity = "SUCCESS"
	SeverityWarning Severity = "WARNING"
	SeverityError   Severity = "ERROR"
)

type Notification struct {
	ID        uuid.UUID      `json:"id"`
	UserID    uuid.UUID      `json:"-"`
	Type      Type           `json:"type"`
	Severity  Severity       `json:"severity"`
	Params    map[string]any `json:"params"`
	Link      *string        `json:"link"`
	ReadAt    *time.Time     `json:"readAt"`
	CreatedAt time.Time      `json:"createdAt"`
}

type OutboxEvent struct {
	ID          uuid.UUID  `json:"id"`
	EventType   string     `json:"eventType"`
	Payload     []byte     `json:"payload"`
	CreatedAt   time.Time  `json:"createdAt"`
	ProcessedAt *time.Time `json:"processedAt"`
}

type Repository interface {
	List(userID uuid.UUID, unreadOnly bool, limit, offset int) ([]Notification, int, error)
	GetUnreadCount(userID uuid.UUID) (int, error)
	MarkAsRead(id, userID uuid.UUID) error
	MarkAllAsRead(userID uuid.UUID) error
	CreateMany(notifications []Notification) error

	// Outbox
	SaveOutboxEvent(event *OutboxEvent) error
	FetchUnprocessedEvents(limit int) ([]OutboxEvent, error)
	MarkEventProcessed(id uuid.UUID) error
}
