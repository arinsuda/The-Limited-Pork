# ==============================================================================
# Build Stage
# ==============================================================================
FROM --platform=$BUILDPLATFORM golang:alpine AS builder

# Install build dependencies and timezone data
RUN apk add --no-cache git ca-certificates tzdata

# Create dedicated unprivileged user for production runtime
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup -s /sbin/nologin

WORKDIR /src

# Leverage Docker cache by downloading dependencies first
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy application source code
COPY . .

# Target architecture args provided automatically by docker buildx
ARG TARGETOS TARGETARCH

# Compile API server and migration tool as statically linked, stripped binaries
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} \
    go build -trimpath -ldflags="-s -w -extldflags '-static'" -o /bin/api ./cmd/api && \
    CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} \
    go build -trimpath -ldflags="-s -w -extldflags '-static'" -o /bin/migrate ./cmd/migrate

# ==============================================================================
# Production Runtime Stage
# ==============================================================================
FROM alpine:3.21 AS runner

# Install essential runtime packages (SSL CA certificates & timezone data)
RUN apk --no-cache add ca-certificates tzdata

# Import non-root user from builder stage
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

WORKDIR /app

# Copy compiled binaries and entrypoint script
COPY --from=builder /bin/api /app/api
COPY --from=builder /bin/migrate /app/migrate
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

# Ensure proper permissions and LF line endings for non-root execution
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh /app/api /app/migrate && \
    chown -R appuser:appgroup /app

# Run as unprivileged user
USER appuser:appgroup

# Default application port (configurable via HTTP_PORT env var)
EXPOSE 8080

# Production Healthcheck against zero-dependency liveness endpoint
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["/app/api"]
