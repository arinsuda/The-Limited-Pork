package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	AppEnv                 string        `env:"APP_ENV" envDefault:"development"`
	HTTPPort               int           `env:"HTTP_PORT" envDefault:"8080"`
	Port                   int           `env:"PORT" envDefault:"0"`
	ShutdownTimeoutSeconds time.Duration `env:"SHUTDOWN_TIMEOUT_SECONDS" envDefault:"15s"`
	LogLevel               string        `env:"LOG_LEVEL" envDefault:"info"`
	AppTimezone            string        `env:"APP_TIMEZONE" envDefault:"Asia/Bangkok"`

	// Database (PostgreSQL)
	DatabaseURL string `env:"DATABASE_URL"`
	DBHost      string `env:"DB_HOST" envDefault:"localhost"`
	DBPort      int    `env:"DB_PORT" envDefault:"5433"`
	DBName      string `env:"DB_NAME" envDefault:"mookrob"`
	DBUser      string `env:"DB_USER" envDefault:"mookrob"`
	DBPassword  string `env:"DB_PASSWORD" envDefault:"change-me-postgres"`
	DBSSLMode   string `env:"DB_SSLMODE" envDefault:"disable"`
	AutoMigrate bool   `env:"AUTO_MIGRATE" envDefault:"true"`

	// Redis
	RedisURL      string `env:"REDIS_URL"`
	RedisAddr     string `env:"REDIS_ADDR" envDefault:"localhost:6379"`
	RedisPassword string `env:"REDIS_PASSWORD" envDefault:"change-me-redis"`
	RedisDB       int    `env:"REDIS_DB" envDefault:"0"`

	// MinIO / S3
	MinIOEndpoint       string `env:"MINIO_ENDPOINT" envDefault:"localhost:9000"`
	MinIOAccessKey      string `env:"MINIO_ACCESS_KEY" envDefault:"mookrob-app"`
	MinIOSecretKey      string `env:"MINIO_SECRET_KEY" envDefault:"change-me-minio-app-secret"`
	MinIOBucket         string `env:"MINIO_BUCKET" envDefault:"mookrob"`
	MinIOUseSSL         bool   `env:"MINIO_USE_SSL" envDefault:"false"`
	MinIOPublicEndpoint string `env:"MINIO_PUBLIC_ENDPOINT" envDefault:"http://localhost:9000"`
	MinIOPresignTTLMin  int    `env:"MINIO_PRESIGN_TTL_MINUTES" envDefault:"60"`

	// JWT
	JWTSecret             string        `env:"JWT_SECRET" envDefault:"super-secret-crispy-pork-jwt-signing-key-minimum-32-bytes"`
	JWTIssuer             string        `env:"JWT_ISSUER" envDefault:"mookrob-api"`
	JWTAudience           string        `env:"JWT_AUDIENCE" envDefault:"mookrob-web"`
	AccessTokenTTLMin     time.Duration `env:"ACCESS_TOKEN_TTL_MINUTES" envDefault:"15m"`
	RefreshTokenTTLDays   time.Duration `env:"REFRESH_TOKEN_TTL_DAYS" envDefault:"168h"` // 7 days

	// Cookies
	CookieName     string `env:"COOKIE_NAME" envDefault:"mookrob_rt"`
	CookiePath     string `env:"COOKIE_PATH" envDefault:"/api/v1/auth"`
	CookieSecure   bool   `env:"COOKIE_SECURE" envDefault:"false"`
	CookieSameSite string `env:"COOKIE_SAME_SITE" envDefault:"Strict"`
	CookieDomain   string `env:"COOKIE_DOMAIN" envDefault:""`

	// CORS
	CORSAllowedOrigins []string `env:"CORS_ALLOWED_ORIGINS" envSeparator:"," envDefault:"http://localhost:5173,http://localhost:8080,http://localhost:8081,https://localhost,http://localhost,capacitor://localhost"`

	// Rate limiting
	RateLimitLoginPerMin int `env:"RATE_LIMIT_LOGIN_PER_MINUTE" envDefault:"10"`

	// Pagination
	PaginationDefaultPageSize int `env:"PAGINATION_DEFAULT_PAGE_SIZE" envDefault:"20"`
	PaginationMaxPageSize     int `env:"PAGINATION_MAX_PAGE_SIZE" envDefault:"100"`

	// File upload
	UploadMaxBytes        int64    `env:"UPLOAD_MAX_BYTES" envDefault:"10485760"` // 10MB
	UploadAllowedMIMETypes []string `env:"UPLOAD_ALLOWED_MIME_TYPES" envSeparator:"," envDefault:"image/jpeg,image/png,image/webp"`

	// WebSocket
	WSTicketTTLSeconds      time.Duration `env:"WS_TICKET_TTL_SECONDS" envDefault:"60s"`
	WSPingIntervalSeconds   time.Duration `env:"WS_PING_INTERVAL_SECONDS" envDefault:"25s"`
	WSWriteTimeoutSeconds   time.Duration `env:"WS_WRITE_TIMEOUT_SECONDS" envDefault:"10s"`
	WSMaxMessageBytes       int64         `env:"WS_MAX_MESSAGE_BYTES" envDefault:"4096"`

	// Outbox
	OutboxPollIntervalMS time.Duration `env:"OUTBOX_POLL_INTERVAL_MS" envDefault:"500ms"`
	OutboxBatchSize      int           `env:"OUTBOX_BATCH_SIZE" envDefault:"50"`

	// Domain rules
	ProcessTempMinC  float64 `env:"PROCESS_TEMP_MIN_C" envDefault:"0"`
	ProcessTempMaxC  float64 `env:"PROCESS_TEMP_MAX_C" envDefault:"350"`
	TrialCompareMax  int     `env:"TRIAL_COMPARE_MAX" envDefault:"5"`
	RecipeCodePrefix string  `env:"RECIPE_CODE_PREFIX" envDefault:"RCP"`

	// Bootstrap Admin
	BootstrapAdminEmail    string `env:"BOOTSTRAP_ADMIN_EMAIL" envDefault:"admin@mookrob.local"`
	BootstrapAdminPassword string `env:"BOOTSTRAP_ADMIN_PASSWORD" envDefault:"Admin@123456"`
	BootstrapAdminName     string `env:"BOOTSTRAP_ADMIN_NAME" envDefault:"Owner Admin"`
}

func (c *Config) DSN() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode)
}

func Load() (*Config, error) {
	_ = godotenv.Load() // optional local .env

	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	if cfg.Port > 0 {
		cfg.HTTPPort = cfg.Port
	} else if portStr := os.Getenv("PORT"); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			cfg.HTTPPort = p
		}
	}

	// Fallback environment variable aliases
	if cfg.DatabaseURL == "" {
		if neonURL := os.Getenv("NEON_DATABASE_URL"); neonURL != "" {
			cfg.DatabaseURL = neonURL
		}
	}
	if cfg.MinIOAccessKey == "mookrob-app" || cfg.MinIOAccessKey == "" {
		if r2Key := os.Getenv("R2_Access_Key_ID"); r2Key != "" {
			cfg.MinIOAccessKey = r2Key
		}
	}
	if cfg.MinIOSecretKey == "change-me-minio-app-secret" || cfg.MinIOSecretKey == "" {
		if r2Secret := os.Getenv("R2_Secret_Key"); r2Secret != "" {
			cfg.MinIOSecretKey = r2Secret
		}
	}
	if cfg.MinIOPublicEndpoint == "http://localhost:9000" || cfg.MinIOPublicEndpoint == "" {
		if r2Pub := os.Getenv("R2_Public_URL"); r2Pub != "" {
			cfg.MinIOPublicEndpoint = r2Pub
		}
	}

	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if c.HTTPPort <= 0 || c.HTTPPort > 65535 {
		return fmt.Errorf("invalid HTTP_PORT: %d", c.HTTPPort)
	}
	if c.DatabaseURL == "" && (c.DBHost == "" || c.DBName == "" || c.DBUser == "") {
		return fmt.Errorf("DB_HOST, DB_NAME, and DB_USER must not be empty when DATABASE_URL is not provided")
	}
	if len(c.JWTSecret) < 16 {
		return fmt.Errorf("JWT_SECRET must be at least 16 characters")
	}
	if c.MinIOBucket == "" {
		return fmt.Errorf("MINIO_BUCKET must not be empty")
	}
	if c.PaginationDefaultPageSize <= 0 || c.PaginationMaxPageSize < c.PaginationDefaultPageSize {
		return fmt.Errorf("invalid pagination configuration")
	}
	if c.TrialCompareMax < 2 {
		return fmt.Errorf("TRIAL_COMPARE_MAX must be at least 2")
	}
	return nil
}

func (c *Config) IsAllowedMIME(mime string) bool {
	clean := strings.ToLower(strings.TrimSpace(mime))
	for _, m := range c.UploadAllowedMIMETypes {
		if strings.ToLower(strings.TrimSpace(m)) == clean {
			return true
		}
	}
	return false
}
