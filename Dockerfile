# COGNIT backend (FastAPI). Build from the repo root:  docker build -t cognit-backend .
# Works on Render, Railway, Fly.io etc. Secrets come from the host's env settings, never the image.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# The backend imports these repo-root packages.
COPY cognit_ai cognit_ai
COPY contracts contracts
COPY backend backend

WORKDIR /app/backend

# Run as a non-root user.
RUN useradd --create-home appuser && mkdir -p /data && chown appuser /data
USER appuser

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
