package application

import (
	"context"
	"crypto/rand"
	"encoding/hex"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/domain/notification"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/pkg/pagination"
)

type NotificationService struct {
	repo  notification.Repository
	cache ports.RedisCache
	cfg   *config.Config
}

func NewNotificationService(repo notification.Repository, cache ports.RedisCache, cfg *config.Config) *NotificationService {
	return &NotificationService{
		repo:  repo,
		cache: cache,
		cfg:   cfg,
	}
}

func (s *NotificationService) List(ctx context.Context, userID uuid.UUID, unreadOnly bool, params pagination.Params) (pagination.Paged[notification.Notification], error) {
	list, total, err := s.repo.List(userID, unreadOnly, params.Limit(), params.Offset())
	if err != nil {
		return pagination.Paged[notification.Notification]{}, err
	}
	return pagination.NewPaged(list, params.Page, params.PageSize, total), nil
}

func (s *NotificationService) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error) {
	return s.repo.GetUnreadCount(userID)
}

func (s *NotificationService) MarkAsRead(ctx context.Context, id, userID uuid.UUID) error {
	return s.repo.MarkAsRead(id, userID)
}

func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	return s.repo.MarkAllAsRead(userID)
}

type TicketResponse struct {
	Ticket    string `json:"ticket"`
	ExpiresIn int    `json:"expiresIn"`
}

func (s *NotificationService) GenerateWSTicket(ctx context.Context, userID uuid.UUID) (*TicketResponse, error) {
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return nil, err
	}
	ticket := hex.EncodeToString(bytes)

	ttl := s.cfg.WSTicketTTLSeconds
	if err := s.cache.SetTicket(ctx, ticket, userID, ttl); err != nil {
		return nil, err
	}

	return &TicketResponse{
		Ticket:    ticket,
		ExpiresIn: int(ttl.Seconds()),
	}, nil
}
