.PHONY: setup migrate api worker test lint frontend build
setup:
	python -m venv .venv
	.venv/bin/python -m pip install --upgrade pip==26.2.1
	.venv/bin/pip install -r backend/requirements.lock
	npm --prefix frontend ci
migrate:
	.venv/bin/alembic upgrade head
api:
	.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --no-access-log
worker:
	.venv/bin/celery -A backend.app.workers.entry:app worker -B --loglevel=warning --schedule=/tmp/hcs-celerybeat
frontend:
	npm --prefix frontend run dev
test:
	.venv/bin/python -m pytest --cov=backend/app --cov-fail-under=80
lint:
	.venv/bin/ruff check backend scripts
	.venv/bin/ruff format --check backend scripts
	npm --prefix frontend run typecheck
build:
	docker build -f infrastructure/docker/backend.Dockerfile -t hcs-backend:local .
	docker build -f infrastructure/docker/frontend.Dockerfile --target production -t hcs-frontend:local .
