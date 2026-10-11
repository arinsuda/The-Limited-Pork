# ---------------------------------------------------------------------------
# หมูกรอบ มี จำกัด — Backend Makefile
# ---------------------------------------------------------------------------
.PHONY: run dev test lint migrate-up

run:
	go run ./cmd/api

dev:
	@if command -v air > /dev/null; then \
		air; \
	else \
		go run ./cmd/api; \
	fi

test:
	go test -v ./...

lint:
	@if command -v golangci-lint > /dev/null; then \
		golangci-lint run ./...; \
	else \
		go vet ./...; \
	fi

migrate-up:
	go run ./cmd/migrate
