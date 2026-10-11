package memory

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/mookrob/backend/pkg/apperror"
)

type ticketEntry struct {
	userID    uuid.UUID
	expiresAt time.Time
}

type rateLimitEntry struct {
	count     int
	resetTime time.Time
}

type Cache struct {
	mu          sync.Mutex
	tickets     map[string]ticketEntry
	rateLimits  map[string]rateLimitEntry
	subscribers map[string][]chan string
}

func NewCache() *Cache {
	c := &Cache{
		tickets:     make(map[string]ticketEntry),
		rateLimits:  make(map[string]rateLimitEntry),
		subscribers: make(map[string][]chan string),
	}
	go c.cleanupLoop()
	return c
}

func (c *Cache) cleanupLoop() {
	ticker := time.NewTicker(30 * time.Second)
	for range ticker.C {
		now := time.Now()
		c.mu.Lock()
		for k, v := range c.tickets {
			if now.After(v.expiresAt) {
				delete(c.tickets, k)
			}
		}
		for k, v := range c.rateLimits {
			if now.After(v.resetTime) {
				delete(c.rateLimits, k)
			}
		}
		c.mu.Unlock()
	}
}

func (c *Cache) SetTicket(ctx context.Context, ticket string, userID uuid.UUID, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.tickets[ticket] = ticketEntry{
		userID:    userID,
		expiresAt: time.Now().Add(ttl),
	}
	return nil
}

func (c *Cache) GetAndConsumeTicket(ctx context.Context, ticket string) (uuid.UUID, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.tickets[ticket]
	if !ok || time.Now().After(entry.expiresAt) {
		delete(c.tickets, ticket)
		return uuid.Nil, apperror.Unauthenticated("invalid or expired websocket ticket")
	}
	delete(c.tickets, ticket)
	return entry.userID, nil
}

func (c *Cache) RateLimit(ctx context.Context, key string, limit int, window time.Duration) (bool, int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	entry, ok := c.rateLimits[key]
	if !ok || now.After(entry.resetTime) {
		c.rateLimits[key] = rateLimitEntry{
			count:     1,
			resetTime: now.Add(window),
		}
		return true, limit - 1, nil
	}

	entry.count++
	c.rateLimits[key] = entry
	if entry.count > limit {
		return false, 0, nil
	}
	return true, limit - entry.count, nil
}

func (c *Cache) Publish(ctx context.Context, channel string, message any) error {
	data, err := json.Marshal(message)
	if err != nil {
		return err
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	subs := c.subscribers[channel]
	for _, ch := range subs {
		select {
		case ch <- string(data):
		default:
		}
	}
	return nil
}

func (c *Cache) Subscribe(ctx context.Context, channel string) (<-chan string, func(), error) {
	c.mu.Lock()
	ch := make(chan string, 100)
	c.subscribers[channel] = append(c.subscribers[channel], ch)
	c.mu.Unlock()

	cancel := func() {
		c.mu.Lock()
		defer c.mu.Unlock()
		subs := c.subscribers[channel]
		for i, sub := range subs {
			if sub == ch {
				c.subscribers[channel] = append(subs[:i], subs[i+1:]...)
				close(ch)
				break
			}
		}
	}

	return ch, cancel, nil
}

func (c *Cache) Ping(ctx context.Context) error {
	return nil
}

func (c *Cache) Close() error {
	return nil
}
