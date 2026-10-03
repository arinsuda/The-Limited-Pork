package redis

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/pkg/apperror"
	goredis "github.com/redis/go-redis/v9"
)

type Client struct {
	rdb *goredis.Client
}

func NewClient(cfg *config.Config) (*Client, error) {
	rdb := goredis.NewClient(&goredis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping redis: %w", err)
	}

	return &Client{rdb: rdb}, nil
}

func (c *Client) Close() error {
	return c.rdb.Close()
}

func (c *Client) Ping(ctx context.Context) error {
	return c.rdb.Ping(ctx).Err()
}

func (c *Client) SetTicket(ctx context.Context, ticket string, userID uuid.UUID, ttl time.Duration) error {
	key := "ws:ticket:" + ticket
	return c.rdb.Set(ctx, key, userID.String(), ttl).Err()
}

func (c *Client) GetAndConsumeTicket(ctx context.Context, ticket string) (uuid.UUID, error) {
	key := "ws:ticket:" + ticket
	val, err := c.rdb.GetDel(ctx, key).Result()
	if err != nil {
		if errors.Is(err, goredis.Nil) {
			return uuid.Nil, apperror.Unauthenticated("invalid or expired websocket ticket")
		}
		return uuid.Nil, fmt.Errorf("failed to getdel ticket: %w", err)
	}

	uid, err := uuid.Parse(val)
	if err != nil {
		return uuid.Nil, apperror.Unauthenticated("corrupt ticket payload")
	}

	return uid, nil
}

func (c *Client) RateLimit(ctx context.Context, key string, limit int, window time.Duration) (bool, int, error) {
	redisKey := "ratelimit:" + key
	pipe := c.rdb.TxPipeline()
	incr := pipe.Incr(ctx, redisKey)
	pipe.Expire(ctx, redisKey, window)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return true, limit, nil // Fail open on redis error
	}

	val := int(incr.Val())
	if val > limit {
		return false, 0, nil
	}

	return true, limit - val, nil
}

func (c *Client) Publish(ctx context.Context, channel string, message any) error {
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal pubsub message: %w", err)
	}
	return c.rdb.Publish(ctx, channel, data).Err()
}

func (c *Client) Subscribe(ctx context.Context, channel string) (<-chan string, func(), error) {
	pubsub := c.rdb.Subscribe(ctx, channel)
	ch := make(chan string, 100)

	go func() {
		defer close(ch)
		for msg := range pubsub.Channel() {
			ch <- msg.Payload
		}
	}()

	cancel := func() {
		_ = pubsub.Close()
	}

	return ch, cancel, nil
}
