# ---------------------------------------------------------------------------
# หมูกรอบ มี จำกัด — root Makefile (delegates to backend/ and frontend/)
# ---------------------------------------------------------------------------
SHELL := /bin/bash
COMPOSE := docker compose -f deploy/docker-compose.yml --env-file deploy/.env

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.PHONY: setup
setup: ## First-time setup: copy env files and install dependencies
	@test -f deploy/.env || cp deploy/.env.example deploy/.env
	@test -f backend/.env || cp backend/.env.example backend/.env
	@test -f frontend/.env || cp frontend/.env.example frontend/.env
	cd backend && go mod download
	cd frontend && npm ci

## ---- Infrastructure ----
.PHONY: infra-up infra-down infra-logs infra-reset
infra-up: ## Start Postgres, Redis, MinIO
	$(COMPOSE) up -d postgres redis minio minio-init

infra-down: ## Stop infrastructure (keep data)
	$(COMPOSE) down

infra-logs: ## Tail infrastructure logs
	$(COMPOSE) logs -f

infra-reset: ## DANGER: stop infrastructure and delete all volumes
	$(COMPOSE) down -v

.PHONY: up-all down-all
up-all: ## Build & run whole stack in containers (profile app)
	$(COMPOSE) --profile app up -d --build

down-all: ## Stop whole stack
	$(COMPOSE) --profile app down

## ---- Backend ----
.PHONY: migrate be-dev be-run be-test be-lint
migrate: ## Apply DB migrations
	$(MAKE) -C backend migrate-up

be-dev: ## Run backend with hot reload (air)
	$(MAKE) -C backend dev

be-run: ## Run backend
	$(MAKE) -C backend run

be-test: ## Backend unit tests
	$(MAKE) -C backend test

be-lint: ## Backend lint
	$(MAKE) -C backend lint

## ---- Frontend ----
.PHONY: fe-dev fe-build fe-test fe-lint
fe-dev: ## Run frontend dev server
	cd frontend && npm run dev

fe-build: ## Build frontend
	cd frontend && npm run build

fe-test: ## Frontend tests
	cd frontend && npm test -- --run

fe-lint: ## Frontend lint + typecheck
	cd frontend && npm run lint && npm run typecheck

## ---- All ----
.PHONY: test lint
test: be-test fe-test ## Run all tests
lint: be-lint fe-lint ## Run all linters
