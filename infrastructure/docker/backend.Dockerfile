FROM python:3.12-alpine
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apk upgrade --no-cache
RUN python -m pip install --no-cache-dir --upgrade pip==26.2.1
COPY backend/requirements-runtime.lock /app/requirements.lock
RUN pip install --no-cache-dir -r requirements.lock && python -m pip uninstall -y pip setuptools
RUN adduser -D -u 10001 hcs
COPY --chown=hcs:hcs backend /app/backend
COPY --chown=hcs:hcs scripts /app/scripts
COPY --chown=hcs:hcs alembic.ini pyproject.toml /app/
USER hcs
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log", "--no-proxy-headers"]
