# Single-service Cognit deployment: build React, serve UI and FastAPI on one host.
# Railway/Render: connect this repository and build with this Dockerfile.
FROM node:24-alpine AS frontend-builder
WORKDIR /site/frontend
COPY frontend/package.json frontend/package-lock.json ./
# Existing lockfile is not compatible with npm ci (missing @types/trusted-types).
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    COGNIT_AI_ENABLED=false
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY cognit_ai cognit_ai
COPY contracts contracts
COPY backend backend
COPY --from=frontend-builder /site/frontend/dist /app/frontend/dist
RUN useradd --create-home appuser && mkdir -p /data && chown appuser /data
WORKDIR /app
USER appuser
EXPOSE 8000
CMD ["sh","-c","uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
