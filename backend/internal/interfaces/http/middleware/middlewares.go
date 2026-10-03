package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/interfaces/http/response"
	"github.com/mookrob/backend/pkg/apperror"
)

type userContextKey struct{}

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = uuid.New().String()
		}
		w.Header().Set("X-Request-ID", reqID)
		r.Header.Set("X-Request-ID", reqID)
		next.ServeHTTP(w, r)
	})
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := chiMiddleware.NewWrapResponseWriter(w, r.ProtoMajor)

		next.ServeHTTP(ww, r)

		duration := time.Since(start)
		slog.Info("http request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.Status(),
			"duration_ms", duration.Milliseconds(),
			"request_id", r.Header.Get("X-Request-ID"),
			"ip", r.RemoteAddr,
		)
	})
}

func Recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("recovered from panic", "panic", rec, "request_id", r.Header.Get("X-Request-ID"))
				response.Error(w, r, apperror.Internal(fmt.Errorf("%v", rec)))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func Auth(tokenIssuer ports.TokenIssuer) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				response.Error(w, r, apperror.Unauthenticated("missing or invalid authorization header"))
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := tokenIssuer.ParseAccessToken(tokenString)
			if err != nil {
				response.Error(w, r, err)
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey{}, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequirePermission(permCode string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetUserClaims(r.Context())
			if claims == nil {
				response.Error(w, r, apperror.Unauthenticated("authentication required"))
				return
			}

			// Check if permission exists in user permissions
			hasPerm := false
			for _, p := range claims.Permissions {
				if p == permCode {
					hasPerm = true
					break
				}
			}

			if !hasPerm {
				response.Error(w, r, apperror.Forbidden(fmt.Sprintf("requires permission '%s'", permCode)))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func RateLimit(cache ports.RedisCache, limit int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr
			if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
				ip = strings.Split(forwarded, ",")[0]
			}

			allowed, remaining, err := cache.RateLimit(r.Context(), "login:"+ip, limit, window)
			if err == nil && !allowed {
				response.Error(w, r, apperror.New(http.StatusTooManyRequests, apperror.CodeRateLimited, "too many attempts, please try again later"))
				return
			}

			w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
			next.ServeHTTP(w, r)
		})
	}
}

func GetUserClaims(ctx context.Context) *ports.Claims {
	if claims, ok := ctx.Value(userContextKey{}).(*ports.Claims); ok {
		return claims
	}
	return nil
}
