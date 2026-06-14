.PHONY: help env up down logs build tidy sample sqlc migrate-up migrate-down migrate-seed health db-health demo

help:
	@echo "School Camera Platform"
	@echo ""
	@echo "  make env           Copy .env.example to .env"
	@echo "  make sample        Generate samples/sample.mp4 (requires ffmpeg)"
	@echo "  make up            docker compose up --build"
	@echo "  make down          docker compose down"
	@echo "  make logs          docker compose logs -f"
	@echo "  make build         docker compose build"
	@echo "  make tidy          go mod tidy"
	@echo "  make sqlc          Generate sqlc code from sql/"
	@echo "  make migrate-up    Run migrations in Docker"
	@echo "  make migrate-seed  Apply dev seed data in Docker"
	@echo "  make health        curl GET /health"
	@echo "  make db-health     curl GET /db/health"
	@echo "  make demo          curl GET /demo/live"

env:
	cp -n .env.example .env 2>/dev/null || cp .env.example .env

sample:
	@mkdir -p samples
	ffmpeg -y -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=48000 \
		-pix_fmt yuv420p -c:v libx264 -t 30 -c:a aac -shortest samples/sample.mp4
	@echo "Created samples/sample.mp4"

up: env
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

build:
	docker compose build

tidy:
	go mod tidy

sqlc:
	cd sql && sqlc generate

migrate-up:
	docker compose run --rm migrate up

migrate-down:
	docker compose run --rm migrate down

migrate-seed:
	docker compose run --rm migrate-seed seed

health:
	@. ./.env 2>/dev/null; curl -s "http://localhost:$${API_PORT:-58081}/health" | jq .

db-health:
	@. ./.env 2>/dev/null; curl -s "http://localhost:$${API_PORT:-58081}/db/health" | jq .

demo:
	@. ./.env 2>/dev/null; curl -s "http://localhost:$${API_PORT:-58081}/demo/live" | jq .
