package websocket

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/infrastructure/config"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Handled by CORS / reverse proxy
	},
}

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	userID uuid.UUID
	send   chan []byte
}

type Hub struct {
	cfg          *config.Config
	clientsMutex sync.RWMutex
	clients      map[uuid.UUID]map[*Client]bool
	broadcast    chan []byte
	register     chan *Client
	unregister   chan *Client
	redis        ports.RedisCache
}

func NewHub(cfg *config.Config, redis ports.RedisCache) *Hub {
	return &Hub{
		cfg:        cfg,
		clients:    make(map[uuid.UUID]map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		redis:      redis,
	}
}

func (h *Hub) Run(ctx context.Context) {
	// Subscribe to Redis pubsub for cluster-wide events
	subCh, unsub, err := h.redis.Subscribe(ctx, "mookrob:events")
	if err == nil {
		go func() {
			defer unsub()
			for {
				select {
				case <-ctx.Done():
					return
				case payload, ok := <-subCh:
					if !ok {
						return
					}
					h.dispatchRedisPayload([]byte(payload))
				}
			}
		}()
	} else {
		slog.Warn("failed to subscribe to redis pubsub events", "error", err)
	}

	for {
		select {
		case <-ctx.Done():
			h.clientsMutex.Lock()
			for _, userClients := range h.clients {
				for c := range userClients {
					close(c.send)
					_ = c.conn.Close()
				}
			}
			h.clients = make(map[uuid.UUID]map[*Client]bool)
			h.clientsMutex.Unlock()
			return

		case client := <-h.register:
			h.clientsMutex.Lock()
			if _, ok := h.clients[client.userID]; !ok {
				h.clients[client.userID] = make(map[*Client]bool)
			}
			h.clients[client.userID][client] = true
			h.clientsMutex.Unlock()

		case client := <-h.unregister:
			h.clientsMutex.Lock()
			if userClients, ok := h.clients[client.userID]; ok {
				if _, has := userClients[client]; has {
					delete(userClients, client)
					close(client.send)
					if len(userClients) == 0 {
						delete(h.clients, client.userID)
					}
				}
			}
			h.clientsMutex.Unlock()
		}
	}
}

type EventWrapper struct {
	TargetUserIDs []uuid.UUID `json:"targetUserIds,omitempty"`
	Message       any         `json:"message"`
}

func (h *Hub) dispatchRedisPayload(payload []byte) {
	var wrapper EventWrapper
	if err := json.Unmarshal(payload, &wrapper); err != nil {
		return
	}

	msgBytes, err := json.Marshal(wrapper.Message)
	if err != nil {
		return
	}

	h.clientsMutex.RLock()
	defer h.clientsMutex.RUnlock()

	if len(wrapper.TargetUserIDs) == 0 {
		// Broadcast to all connected
		for _, userClients := range h.clients {
			for c := range userClients {
				select {
				case c.send <- msgBytes:
				default:
				}
			}
		}
	} else {
		// Send to specific target users
		for _, uid := range wrapper.TargetUserIDs {
			if userClients, ok := h.clients[uid]; ok {
				for c := range userClients {
					select {
					case c.send <- msgBytes:
					default:
					}
				}
			}
		}
	}
}

func (h *Hub) BroadcastToUsers(userIDs []uuid.UUID, message any) {
	wrapper := EventWrapper{
		TargetUserIDs: userIDs,
		Message:       message,
	}
	_ = h.redis.Publish(context.Background(), "mookrob:events", wrapper)
}

func (h *Hub) SendToUser(userID uuid.UUID, message any) {
	h.BroadcastToUsers([]uuid.UUID{userID}, message)
}

func (h *Hub) BroadcastEntityChanged(entity string, id uuid.UUID, action string) {
	msg := map[string]any{
		"type": "entity.changed",
		"data": map[string]any{
			"entity": entity,
			"id":     id.String(),
			"action": action,
		},
	}
	// Broadcast to all connected clients
	wrapper := EventWrapper{
		TargetUserIDs: nil,
		Message:       msg,
	}
	_ = h.redis.Publish(context.Background(), "mookrob:events", wrapper)
}

func (h *Hub) HandleWS(w http.ResponseWriter, r *http.Request, userID uuid.UUID) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("websocket upgrade error", "error", err)
		return
	}

	client := &Client{
		hub:    h,
		conn:   conn,
		userID: userID,
		send:   make(chan []byte, 64),
	}

	h.register <- client

	go client.writePump(h.cfg)
	go client.readPump(h.cfg)
}

func (c *Client) readPump(cfg *config.Config) {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(cfg.WSMaxMessageBytes)
	_ = c.conn.SetReadDeadline(time.Now().Add(cfg.WSPingIntervalSeconds * 2))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(cfg.WSPingIntervalSeconds * 2))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var msg map[string]any
		if err := json.Unmarshal(message, &msg); err == nil {
			if t, ok := msg["type"].(string); ok && t == "ping" {
				pong, _ := json.Marshal(map[string]string{"type": "pong"})
				c.send <- pong
			}
		}
	}
}

func (c *Client) writePump(cfg *config.Config) {
	ticker := time.NewTicker(cfg.WSPingIntervalSeconds)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(cfg.WSWriteTimeoutSeconds))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)
			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(cfg.WSWriteTimeoutSeconds))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
