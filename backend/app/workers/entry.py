"""Celery CLI composition root; deterministic tasks remain independently testable."""

from backend.app.workers.tasks import celery_app

app = celery_app()
