package ports

import (
	"context"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/domain/notification"
)

type Clock interface {
	Now() time.Time
}

type IDGen interface {
	NewUUID() uuid.UUID
}

type PasswordHasher interface {
	HashPassword(password string) (string, error)
	ComparePassword(password, hash string) bool
}

type Claims struct {
	UserID      uuid.UUID `json:"userId"`
	Email       string    `json:"email"`
	DisplayName string    `json:"name"`
	Roles       []string  `json:"roles"`
	Permissions []string  `json:"permissions"`
	Locale      string    `json:"locale"`
}

type TokenIssuer interface {
	GenerateAccessToken(claims Claims) (string, time.Duration, error)
	GenerateRefreshToken() (token string, hash string, familyID uuid.UUID, expiresAt time.Time, err error)
	ParseAccessToken(tokenString string) (*Claims, error)
	HashToken(token string) string
}

type FileMetadata struct {
	ObjectName  string
	ContentType string
	SizeBytes   int64
	URL         string
}

type ObjectStorage interface {
	Upload(ctx context.Context, objectKey string, reader io.Reader, sizeBytes int64, contentType string) error
	PresignGet(ctx context.Context, objectKey string, expires time.Duration) (string, error)
	Delete(ctx context.Context, objectKey string) error
	EnsureBucket(ctx context.Context) error
}

type RedisCache interface {
	SetTicket(ctx context.Context, ticket string, userID uuid.UUID, ttl time.Duration) error
	GetAndConsumeTicket(ctx context.Context, ticket string) (uuid.UUID, error)
	RateLimit(ctx context.Context, key string, limit int, window time.Duration) (allowed bool, remaining int, err error)
	Publish(ctx context.Context, channel string, message any) error
	Subscribe(ctx context.Context, channel string) (<-chan string, func(), error)
}

type WebSocketHub interface {
	BroadcastToUsers(userIDs []uuid.UUID, message any)
	BroadcastEntityChanged(entity string, id uuid.UUID, action string)
	SendToUser(userID uuid.UUID, message any)
}

type EventPublisher interface {
	PublishEvent(ctx context.Context, eventType string, payload any) error
	DispatchOutbox(ctx context.Context) (int, error)
}

type TxManager interface {
	WithTx(ctx context.Context, fn func(ctx context.Context) error) error
}

type OutboxNotificationPayload struct {
	Type     notification.Type     `json:"type"`
	Severity notification.Severity `json:"severity"`
	Params   map[string]any        `json:"params"`
	Link     *string               `json:"link"`
	PermCode string                `json:"permCode"` // Send to users with this permission
	ActorID  uuid.UUID             `json:"actorId"`
}
