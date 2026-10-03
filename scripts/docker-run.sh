#!/usr/bin/env bash
# ==============================================================================
# หมูกรอบ มี จำกัด — Enterprise Docker Run Orchestration Script
# ==============================================================================
# Usage:
#   ./scripts/docker-run.sh [command]
#
# Commands:
#   up          Create network, volumes, and run all containers via 'docker run'
#   down        Gracefully stop and remove all application containers
#   build       Build Backend and Frontend Docker images
#   status      Show status and health of all running containers
#   logs        Tail logs of all or a specific container
#   help        Show this help message
#
# Best Practices:
#   - Zero hardcoding: all variables load from deploy/.env or environment
#   - Independent Docker network for service discovery
#   - Named persistent volumes for PostgreSQL, Redis, and MinIO
#   - Container healthchecks and dependency sequencing
#   - Non-root execution and security limits
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load configuration from deploy/.env if present, otherwise fallback to defaults
ENV_FILE="${ROOT_DIR}/deploy/.env"
if [[ -f "${ENV_FILE}" ]]; then
  # Export non-comment lines
  # shellcheck disable=SC2046
  export $(grep -v '^#' "${ENV_FILE}" | xargs -0)
elif [[ -f "${ROOT_DIR}/deploy/.env.example" ]]; then
  echo "[INFO] deploy/.env not found, using defaults from deploy/.env.example"
  # shellcheck disable=SC2046
  export $(grep -v '^#' "${ROOT_DIR}/deploy/.env.example" | xargs -0)
fi

# ------------------------------------------------------------------------------
# Configurable Variables (Zero Hardcoding)
# ------------------------------------------------------------------------------
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-moo-krob}"
DOCKER_NETWORK="${DOCKER_NETWORK:-${PROJECT_NAME}-net}"
TZ="${TZ:-Asia/Bangkok}"

# PostgreSQL
POSTGRES_IMAGE="postgres:${POSTGRES_IMAGE_TAG:-17-alpine}"
POSTGRES_CONTAINER="${PROJECT_NAME}-postgres"
POSTGRES_PORT="${POSTGRES_PORT:-5433}"
POSTGRES_DB="${POSTGRES_DB:-mookrob}"
POSTGRES_USER="${POSTGRES_USER:-mookrob}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change-me-postgres}"
POSTGRES_VOLUME="${PROJECT_NAME}-pg-data"

# Redis
REDIS_IMAGE="redis:${REDIS_IMAGE_TAG:-7-alpine}"
REDIS_CONTAINER="${PROJECT_NAME}-redis"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-change-me-redis}"
REDIS_VOLUME="${PROJECT_NAME}-redis-data"

# MinIO
MINIO_IMAGE="${MINIO_IMAGE:-cgr.dev/chainguard/minio:latest}"
MINIO_CONTAINER="${PROJECT_NAME}-minio"
MINIO_API_PORT="${MINIO_API_PORT:-9000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-change-me-minio-root}"
MINIO_BUCKET="${MINIO_BUCKET:-mookrob}"
MINIO_APP_ACCESS_KEY="${MINIO_APP_ACCESS_KEY:-mookrob-app}"
MINIO_APP_SECRET_KEY="${MINIO_APP_SECRET_KEY:-change-me-minio-app-secret}"
MINIO_VOLUME="${PROJECT_NAME}-minio-data"
MINIO_PUBLIC_ENDPOINT="${MINIO_PUBLIC_ENDPOINT:-http://localhost:${MINIO_API_PORT}}"

# Backend API
BACKEND_IMAGE="${BACKEND_IMAGE:-${PROJECT_NAME}-backend:latest}"
BACKEND_CONTAINER="${PROJECT_NAME}-api"
API_PORT="${API_PORT:-8080}"
JWT_SECRET="${JWT_SECRET:-super-secret-crispy-pork-jwt-signing-key-minimum-32-bytes}"
JWT_ISSUER="${JWT_ISSUER:-mookrob-api}"
JWT_AUDIENCE="${JWT_AUDIENCE:-mookrob-web}"
LOG_LEVEL="${LOG_LEVEL:-info}"

# Frontend Web
FRONTEND_IMAGE="${FRONTEND_IMAGE:-${PROJECT_NAME}-frontend:latest}"
FRONTEND_CONTAINER="${PROJECT_NAME}-web"
WEB_PORT="${WEB_PORT:-8081}"

# Helper formatting
COLOR_GREEN="\033[0;32m"
COLOR_YELLOW="\033[0;33m"
COLOR_BLUE="\033[0;34m"
COLOR_RED="\033[0;31m"
COLOR_RESET="\033[0m"

log_info()  { echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"; }
log_succ()  { echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} $1"; }
log_warn()  { echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET} $1"; }
log_err()   { echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"; }

# ------------------------------------------------------------------------------
# Build Docker Images
# ------------------------------------------------------------------------------
cmd_build() {
  log_info "Building Backend Docker image: ${BACKEND_IMAGE}..."
  docker build -t "${BACKEND_IMAGE}" -f "${ROOT_DIR}/backend/Dockerfile" "${ROOT_DIR}/backend"
  log_succ "Backend image built successfully."

  log_info "Building Frontend Docker image: ${FRONTEND_IMAGE}..."
  docker build -t "${FRONTEND_IMAGE}" \
    --build-arg VITE_API_BASE_URL="${WEB_API_BASE_URL:-/api/v1}" \
    -f "${ROOT_DIR}/frontend/Dockerfile" "${ROOT_DIR}/frontend"
  log_succ "Frontend image built successfully."
}

# ------------------------------------------------------------------------------
# Setup Network and Volumes
# ------------------------------------------------------------------------------
setup_infra_prerequisites() {
  if ! docker network inspect "${DOCKER_NETWORK}" >/dev/null 2>&1; then
    log_info "Creating Docker network: ${DOCKER_NETWORK}..."
    docker network create "${DOCKER_NETWORK}"
  fi

  for vol in "${POSTGRES_VOLUME}" "${REDIS_VOLUME}" "${MINIO_VOLUME}"; do
    if ! docker volume inspect "${vol}" >/dev/null 2>&1; then
      log_info "Creating Docker volume: ${vol}..."
      docker volume create "${vol}"
    fi
  done
}

# ------------------------------------------------------------------------------
# Wait for healthy container
# ------------------------------------------------------------------------------
wait_for_health() {
  local container="$1"
  local max_retries="${2:-30}"
  local count=0
  log_info "Waiting for ${container} to be healthy..."
  until [[ "$(docker inspect -f '{{.State.Health.Status}}' "${container}" 2>/dev/null)" == "healthy" ]]; do
    sleep 1
    count=$((count + 1))
    if [[ $count -ge $max_retries ]]; then
      log_warn "${container} did not report healthy within ${max_retries}s, continuing..."
      return 0
    fi
  done
  log_succ "${container} is healthy."
}

# ------------------------------------------------------------------------------
# Run all containers via `docker run`
# ------------------------------------------------------------------------------
cmd_up() {
  setup_infra_prerequisites

  # 1. PostgreSQL
  if docker ps -a --format '{{.Names}}' | grep -Eq "^${POSTGRES_CONTAINER}\$"; then
    log_warn "Container ${POSTGRES_CONTAINER} already exists. Starting it..."
    docker start "${POSTGRES_CONTAINER}" >/dev/null
  else
    log_info "Starting PostgreSQL via docker run..."
    docker run -d \
      --name "${POSTGRES_CONTAINER}" \
      --network "${DOCKER_NETWORK}" \
      --restart unless-stopped \
      -e POSTGRES_DB="${POSTGRES_DB}" \
      -e POSTGRES_USER="${POSTGRES_USER}" \
      -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
      -e TZ="${TZ}" \
      -p "${POSTGRES_PORT}:5432" \
      -v "${POSTGRES_VOLUME}:/var/lib/postgresql/data" \
      --health-cmd="pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}" \
      --health-interval=5s \
      --health-timeout=5s \
      --health-retries=20 \
      "${POSTGRES_IMAGE}" >/dev/null
  fi
  wait_for_health "${POSTGRES_CONTAINER}" 30

  # 2. Redis
  if docker ps -a --format '{{.Names}}' | grep -Eq "^${REDIS_CONTAINER}\$"; then
    log_warn "Container ${REDIS_CONTAINER} already exists. Starting it..."
    docker start "${REDIS_CONTAINER}" >/dev/null
  else
    log_info "Starting Redis via docker run..."
    docker run -d \
      --name "${REDIS_CONTAINER}" \
      --network "${DOCKER_NETWORK}" \
      --restart unless-stopped \
      -e REDIS_PASSWORD="${REDIS_PASSWORD}" \
      -p "${REDIS_PORT}:6379" \
      -v "${REDIS_VOLUME}:/data" \
      --health-cmd="redis-cli -a ${REDIS_PASSWORD} ping | grep PONG" \
      --health-interval=5s \
      --health-timeout=5s \
      --health-retries=20 \
      "${REDIS_IMAGE}" \
      redis-server --requirepass "${REDIS_PASSWORD}" --appendonly yes >/dev/null
  fi
  wait_for_health "${REDIS_CONTAINER}" 20

  # 3. MinIO
  if docker ps -a --format '{{.Names}}' | grep -Eq "^${MINIO_CONTAINER}\$"; then
    log_warn "Container ${MINIO_CONTAINER} already exists. Starting it..."
    docker start "${MINIO_CONTAINER}" >/dev/null
  else
    log_info "Starting MinIO via docker run..."
    docker run -d \
      --name "${MINIO_CONTAINER}" \
      --network "${DOCKER_NETWORK}" \
      --restart unless-stopped \
      -e MINIO_ROOT_USER="${MINIO_ROOT_USER}" \
      -e MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD}" \
      -p "${MINIO_API_PORT}:9000" \
      -p "${MINIO_CONSOLE_PORT}:9001" \
      -v "${MINIO_VOLUME}:/data" \
      --health-cmd="mc ready local" \
      --health-interval=5s \
      --health-timeout=5s \
      --health-retries=20 \
      "${MINIO_IMAGE}" \
      server /data --console-address ":9001" >/dev/null
  fi
  wait_for_health "${MINIO_CONTAINER}" 25

  # 4. MinIO Bucket & Service Account Initialization (one-shot docker run --rm)
  log_info "Configuring MinIO bucket '${MINIO_BUCKET}' & least-privilege credentials..."
  docker run --rm \
    --network "${DOCKER_NETWORK}" \
    --entrypoint /bin/sh \
    "${MINIO_IMAGE}" \
    -c "
      set -e
      mc alias set local http://${MINIO_CONTAINER}:9000 '${MINIO_ROOT_USER}' '${MINIO_ROOT_PASSWORD}' >/dev/null 2>&1
      mc mb --ignore-existing 'local/${MINIO_BUCKET}' >/dev/null 2>&1
      mc anonymous set none 'local/${MINIO_BUCKET}' >/dev/null 2>&1
      echo '{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:PutObject\",\"s3:DeleteObject\",\"s3:ListBucket\",\"s3:GetBucketLocation\"],\"Resource\":[\"arn:aws:s3:::${MINIO_BUCKET}\",\"arn:aws:s3:::${MINIO_BUCKET}/*\"]}]}' > /tmp/policy.json
      mc admin policy create local app-rw /tmp/policy.json >/dev/null 2>&1 || true
      mc admin user add local '${MINIO_APP_ACCESS_KEY}' '${MINIO_APP_SECRET_KEY}' >/dev/null 2>&1 || true
      mc admin policy attach local app-rw --user '${MINIO_APP_ACCESS_KEY}' >/dev/null 2>&1 || true
      echo 'MinIO initialized successfully.'
    "

  # 5. Build images if not present
  if ! docker image inspect "${BACKEND_IMAGE}" >/dev/null 2>&1 || ! docker image inspect "${FRONTEND_IMAGE}" >/dev/null 2>&1; then
    log_info "Application images not found. Building now..."
    cmd_build
  fi

  # 6. Database Migration (one-shot docker run --rm)
  log_info "Applying database migrations..."
  docker run --rm \
    --network "${DOCKER_NETWORK}" \
    -e DB_HOST="${POSTGRES_CONTAINER}" \
    -e DB_PORT=5432 \
    -e DB_NAME="${POSTGRES_DB}" \
    -e DB_USER="${POSTGRES_USER}" \
    -e DB_PASSWORD="${POSTGRES_PASSWORD}" \
    -e DB_SSLMODE=disable \
    "${BACKEND_IMAGE}" \
    /app/migrate

  # 7. Backend API
  run_backend_container

  # 8. Frontend Web
  run_frontend_container

  echo ""
  log_succ "All services started successfully with 'docker run'!"
  echo "=========================================================================="
  echo -e "  🌐 Frontend Web URL : ${COLOR_GREEN}http://localhost:${WEB_PORT}${COLOR_RESET}"
  echo -e "  🚀 Backend API URL  : ${COLOR_GREEN}http://localhost:${API_PORT}${COLOR_RESET}"
  echo -e "  🗄️  MinIO Console    : ${COLOR_GREEN}http://localhost:${MINIO_CONSOLE_PORT}${COLOR_RESET} (User: ${MINIO_ROOT_USER})"
  echo -e "  🐘 PostgreSQL Port  : ${COLOR_GREEN}localhost:${POSTGRES_PORT}${COLOR_RESET}"
  echo -e "  ⚡ Redis Port       : ${COLOR_GREEN}localhost:${REDIS_PORT}${COLOR_RESET}"
  echo "=========================================================================="
}

run_backend_container() {
  if docker ps -a --format '{{.Names}}' | grep -Eq "^${BACKEND_CONTAINER}\$"; then
    log_warn "Container ${BACKEND_CONTAINER} already exists. Removing older instance..."
    docker rm -f "${BACKEND_CONTAINER}" >/dev/null
  fi

  log_info "Starting Backend API via docker run..."
  docker run -d \
    --name "${BACKEND_CONTAINER}" \
    --network "${DOCKER_NETWORK}" \
    --restart unless-stopped \
    -p "${API_PORT}:8080" \
    -e HTTP_PORT=8080 \
    -e LOG_LEVEL="${LOG_LEVEL}" \
    -e APP_TIMEZONE="${TZ}" \
    -e DB_HOST="${POSTGRES_CONTAINER}" \
    -e DB_PORT=5432 \
    -e DB_NAME="${POSTGRES_DB}" \
    -e DB_USER="${POSTGRES_USER}" \
    -e DB_PASSWORD="${POSTGRES_PASSWORD}" \
    -e DB_SSLMODE=disable \
    -e REDIS_ADDR="${REDIS_CONTAINER}:6379" \
    -e REDIS_PASSWORD="${REDIS_PASSWORD}" \
    -e REDIS_DB=0 \
    -e MINIO_ENDPOINT="${MINIO_CONTAINER}:9000" \
    -e MINIO_ACCESS_KEY="${MINIO_APP_ACCESS_KEY}" \
    -e MINIO_SECRET_KEY="${MINIO_APP_SECRET_KEY}" \
    -e MINIO_BUCKET="${MINIO_BUCKET}" \
    -e MINIO_USE_SSL=false \
    -e MINIO_PUBLIC_ENDPOINT="${MINIO_PUBLIC_ENDPOINT}" \
    -e JWT_SECRET="${JWT_SECRET}" \
    -e JWT_ISSUER="${JWT_ISSUER}" \
    -e JWT_AUDIENCE="${JWT_AUDIENCE}" \
    -e CORS_ALLOWED_ORIGINS="http://localhost:${WEB_PORT},http://localhost:5173,http://localhost:${API_PORT}" \
    -e AUTO_MIGRATE=false \
    "${BACKEND_IMAGE}" >/dev/null
  wait_for_health "${BACKEND_CONTAINER}" 20
}

run_frontend_container() {
  if docker ps -a --format '{{.Names}}' | grep -Eq "^${FRONTEND_CONTAINER}\$"; then
    log_warn "Container ${FRONTEND_CONTAINER} already exists. Removing older instance..."
    docker rm -f "${FRONTEND_CONTAINER}" >/dev/null
  fi

  log_info "Starting Frontend Web via docker run..."
  docker run -d \
    --name "${FRONTEND_CONTAINER}" \
    --network "${DOCKER_NETWORK}" \
    --restart unless-stopped \
    -p "${WEB_PORT}:80" \
    -e BACKEND_HOST="${BACKEND_CONTAINER}" \
    -e BACKEND_PORT=8080 \
    -e CLIENT_MAX_BODY_SIZE=25M \
    -e LISTEN_PORT=80 \
    "${FRONTEND_IMAGE}" >/dev/null
  wait_for_health "${FRONTEND_CONTAINER}" 15
}

cmd_rebuild_backend() {
  log_info "Rebuilding Backend Docker image: ${BACKEND_IMAGE}..."
  docker build -t "${BACKEND_IMAGE}" -f "${ROOT_DIR}/backend/Dockerfile" "${ROOT_DIR}/backend"
  run_backend_container
  log_succ "Backend container successfully recreated!"
}

cmd_rebuild_frontend() {
  log_info "Rebuilding Frontend Docker image: ${FRONTEND_IMAGE}..."
  docker build -t "${FRONTEND_IMAGE}" \
    --build-arg VITE_API_BASE_URL="${WEB_API_BASE_URL:-/api/v1}" \
    -f "${ROOT_DIR}/frontend/Dockerfile" "${ROOT_DIR}/frontend"
  run_frontend_container
  log_succ "Frontend container successfully recreated!"
}

cmd_watch() {
  shift || true
  if command -v python3 >/dev/null 2>&1; then
    exec python3 "${ROOT_DIR}/scripts/watcher.py" --root-dir "${ROOT_DIR}" --script "${BASH_SOURCE[0]}" "$@"
  else
    log_err "python3 is required for the file watcher. Please install python3."
    exit 1
  fi
}

# ------------------------------------------------------------------------------
# Stop and remove containers
# ------------------------------------------------------------------------------
cmd_down() {
  log_info "Stopping application containers..."
  docker stop "${FRONTEND_CONTAINER}" "${BACKEND_CONTAINER}" "${MINIO_CONTAINER}" "${REDIS_CONTAINER}" "${POSTGRES_CONTAINER}" 2>/dev/null || true
  log_info "Removing containers..."
  docker rm "${FRONTEND_CONTAINER}" "${BACKEND_CONTAINER}" "${MINIO_CONTAINER}" "${REDIS_CONTAINER}" "${POSTGRES_CONTAINER}" 2>/dev/null || true
  log_succ "All containers stopped and removed."
}

# ------------------------------------------------------------------------------
# Show status of all containers
# ------------------------------------------------------------------------------
cmd_status() {
  docker ps --filter "network=${DOCKER_NETWORK}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# ------------------------------------------------------------------------------
# Tail logs
# ------------------------------------------------------------------------------
cmd_logs() {
  local target="$1"
  if [[ -n "${target}" ]]; then
    docker logs -f "${PROJECT_NAME}-${target}"
  else
    log_info "Tailing logs for all project containers (Ctrl+C to exit)..."
    docker ps --filter "network=${DOCKER_NETWORK}" --format '{{.Names}}' | xargs -I {} docker logs --tail 20 {}
  fi
}

# ------------------------------------------------------------------------------
# Main Dispatcher
# ------------------------------------------------------------------------------
case "$1" in
  up)
    cmd_up
    ;;
  down)
    cmd_down
    ;;
  build)
    cmd_build
    ;;
  rebuild-backend)
    cmd_rebuild_backend
    ;;
  rebuild-frontend)
    cmd_rebuild_frontend
    ;;
  watch)
    cmd_watch "$@"
    ;;
  status)
    cmd_status
    ;;
  logs)
    cmd_logs "$2"
    ;;
  *)
    echo "Usage: $0 {up|down|build|watch|status|logs [service]|rebuild-backend|rebuild-frontend}"
    echo ""
    echo "Examples:"
    echo "  $0 up           # Run all containers via docker run"
    echo "  $0 watch        # Watch source code changes and auto-rebuild containers"
    echo "  $0 build        # Build backend and frontend images"
    echo "  $0 status       # View container status"
    echo "  $0 logs api     # Tail backend logs"
    echo "  $0 down         # Stop and cleanup containers"
    exit 1
    ;;
esac
