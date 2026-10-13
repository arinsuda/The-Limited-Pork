package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mookrob/backend/internal/application"
	"github.com/mookrob/backend/internal/application/ports"
	"github.com/mookrob/backend/internal/domain/identity"
	"github.com/mookrob/backend/internal/infrastructure/auth"
	memoryCache "github.com/mookrob/backend/internal/infrastructure/cache/memory"
	redisCache "github.com/mookrob/backend/internal/infrastructure/cache/redis"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/infrastructure/persistence/postgres"
	wsHub "github.com/mookrob/backend/internal/infrastructure/realtime/websocket"
	minioStorage "github.com/mookrob/backend/internal/infrastructure/storage/minio"
	"github.com/mookrob/backend/internal/infrastructure/system"
	apiHttp "github.com/mookrob/backend/internal/interfaces/http"
	"github.com/mookrob/backend/internal/interfaces/http/handler"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Structured logger setup
	logLevel := slog.LevelInfo
	if cfg.LogLevel == "debug" {
		logLevel = slog.LevelDebug
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))
	slog.SetDefault(logger)

	slog.Info("starting moo-krob api server", "env", cfg.AppEnv, "port", cfg.HTTPPort)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 1. PostgreSQL pool
	pool, err := pgxpool.New(ctx, cfg.DSN())
	if err != nil {
		slog.Error("failed to create postgres pool", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		slog.Error("failed to ping postgres", "error", err)
		os.Exit(1)
	}
	slog.Info("connected to postgres", "dsn_configured", cfg.DatabaseURL != "", "host", cfg.DBHost, "port", cfg.DBPort, "database", cfg.DBName)

	// Auto-run DB migrations on startup if enabled
	if cfg.AutoMigrate {
		slog.Info("applying database migrations (auto-migrate enabled)...")
		migrator := postgres.NewMigrator(pool)
		if err := migrator.Up(ctx); err != nil {
			slog.Error("auto-migration failed", "error", err)
			os.Exit(1)
		}
		slog.Info("database migrations completed successfully")
	}

	// 2. Cache & PubSub (Redis or In-Memory fallback for zero-cost deployment)
	var cacheClient ports.RedisCache
	if cfg.RedisURL != "" || (cfg.RedisAddr != "" && cfg.RedisAddr != "memory" && cfg.RedisAddr != "none") {
		rc, err := redisCache.NewClient(cfg)
		if err != nil {
			slog.Warn("failed to connect to redis, falling back to in-memory cache", "error", err)
			cacheClient = memoryCache.NewCache()
		} else {
			cacheClient = rc
			defer rc.Close()
			slog.Info("connected to redis", "addr", cfg.RedisAddr, "url_configured", cfg.RedisURL != "")
		}
	} else {
		slog.Info("using in-memory cache (zero external redis dependency)")
		cacheClient = memoryCache.NewCache()
	}

	// 3. MinIO / S3 / Cloudflare R2 Object Storage
	storage, err := minioStorage.NewStorage(cfg)
	if err != nil {
		slog.Error("failed to initialize storage client", "error", err)
		os.Exit(1)
	}
	if err := storage.EnsureBucket(ctx); err != nil {
		slog.Warn("ensure bucket failed (will retry on demand)", "bucket", cfg.MinIOBucket, "error", err)
	} else {
		slog.Info("connected to storage and bucket ensured", "bucket", cfg.MinIOBucket)
	}

	// 4. Infrastructure & adapters
	clock := system.NewRealClock()
	idGen := system.NewUUIDGen()
	hasher := auth.NewBcryptHasher()
	jwtService := auth.NewJWTService(cfg, clock, idGen)
	hub := wsHub.NewHub(cfg, cacheClient)
	txManager := postgres.NewTxManager(pool)

	// 5. Repositories
	userRepo := postgres.NewUserRepo(pool)
	roleRepo := postgres.NewRoleRepo(pool)
	refreshRepo := postgres.NewRefreshTokenRepo(pool)
	mdRepo := postgres.NewMasterDataRepo(pool)
	recipeRepo := postgres.NewRecipeRepo(pool)
	trialRepo := postgres.NewTrialRepo(pool)
	attRepo := postgres.NewAttachmentRepo(pool)
	notifRepo := postgres.NewNotificationRepo(pool)
	auditRepo := postgres.NewAuditRepo(pool)
	costingRepo := postgres.NewCostingRepo(pool)

	// 6. Outbox Dispatcher
	outboxDispatcher := application.NewOutboxDispatcher(pool, notifRepo, hub, clock, idGen, cfg)

	// 7. Bootstrap Admin User if configured and not exists
	bootstrapAdmin(ctx, cfg, userRepo, roleRepo, hasher, clock, idGen)

	// 8. Application Services
	authService := application.NewAuthService(userRepo, roleRepo, refreshRepo, hasher, jwtService, clock, idGen, cfg)
	userService := application.NewUserService(userRepo, roleRepo, hasher, clock, idGen)
	mdService := application.NewMasterDataService(mdRepo, clock, idGen, hub)
	recipeService := application.NewRecipeService(recipeRepo, mdRepo, attRepo, storage, outboxDispatcher, txManager, clock, idGen, hub, cfg)
	trialService := application.NewTrialService(trialRepo, recipeRepo, mdRepo, attRepo, storage, outboxDispatcher, txManager, clock, idGen, hub, cfg)
	costingService := application.NewCostingService(costingRepo, recipeRepo, mdRepo, clock, idGen)
	attService := application.NewAttachmentService(attRepo, storage, clock, idGen, cfg)
	notifService := application.NewNotificationService(notifRepo, cacheClient, cfg)

	// 9. HTTP Handlers
	handlers := apiHttp.Handlers{
		Auth:         handler.NewAuthHandler(authService, cfg),
		User:         handler.NewUserHandler(userService, cfg),
		MasterData:   handler.NewMasterDataHandler(mdService, cfg),
		Recipe:       handler.NewRecipeHandler(recipeService, trialService, cfg),
		Trial:        handler.NewTrialHandler(trialService, cfg),
		Attachment:   handler.NewAttachmentHandler(attService, cfg),
		Notification: handler.NewNotificationHandler(notifService, hub, cacheClient, cfg),
		Costing:      handler.NewCostingHandler(costingService, cfg),
		Ops:          handler.NewOpsHandler(pool, cacheClient, storage, auditRepo, cfg),
	}

	// 10. HTTP Router
	router := apiHttp.NewRouter(cfg, jwtService, cacheClient, handlers)

	// 11. Run background tasks
	go hub.Run(ctx)
	go outboxDispatcher.Start(ctx)

	// 12. HTTP Server
	server := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.HTTPPort),
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		slog.Info("http server listening", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server listen error", "error", err)
			os.Exit(1)
		}
	}()

	// 13. Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server gracefully...")
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeoutSeconds)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}

	slog.Info("server exited cleanly")
}

func bootstrapAdmin(
	ctx context.Context,
	cfg *config.Config,
	userRepo identity.UserRepository,
	roleRepo identity.RoleRepository,
	hasher ports.PasswordHasher,
	clock ports.Clock,
	idGen ports.IDGen,
) {
	adminEmail := cfg.BootstrapAdminEmail
	if adminEmail == "" || cfg.BootstrapAdminPassword == "" {
		return
	}

	existing, err := userRepo.GetByEmail(adminEmail)
	if err == nil && existing != nil {
		slog.Info("admin user already exists", "email", adminEmail)
		return
	}

	roles, err := roleRepo.List()
	if err != nil {
		slog.Warn("failed to fetch roles for admin bootstrap", "error", err)
		return
	}

	var ownerRole *identity.Role
	for _, r := range roles {
		if r.Code == "OWNER" {
			ownerRole = &r
			break
		}
	}

	if ownerRole == nil {
		slog.Warn("OWNER role not found during admin bootstrap")
		return
	}

	hash, err := hasher.HashPassword(cfg.BootstrapAdminPassword)
	if err != nil {
		slog.Error("failed to hash admin password", "error", err)
		return
	}

	displayName := cfg.BootstrapAdminName
	if displayName == "" {
		displayName = "Administrator"
	}

	adminUser := &identity.User{
		ID:           idGen.NewUUID(),
		Email:        adminEmail,
		DisplayName:  displayName,
		PasswordHash: hash,
		Locale:       "th",
		IsActive:     true,
		Roles:        []identity.Role{*ownerRole},
		Version:      1,
		CreatedAt:    clock.Now(),
		UpdatedAt:    clock.Now(),
	}

	if err := userRepo.Create(adminUser); err != nil {
		slog.Error("failed to bootstrap admin user", "error", err)
		return
	}

	slog.Info("bootstrapped admin user successfully", "email", adminEmail, "role", "OWNER")
}
