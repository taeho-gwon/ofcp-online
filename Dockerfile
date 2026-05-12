# ── Stage 1: frontend 빌드 ─────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Vite는 VITE_* 환경변수를 빌드 시점에 inline. build arg로 받아 환경변수로 전달.
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# ── Stage 2: Python 런타임 ─────────────────────────────────────────────────
FROM python:3.13-slim

# uv 설치 (의존성 해결/설치를 빠르게)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

# 의존성만 먼저 설치하여 레이어 캐시 활용
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

# 앱 소스 복사
COPY app ./app
COPY scripts ./scripts

# 프로젝트 자체 설치
RUN uv sync --frozen --no-dev

# 빌드된 프론트엔드 정적 파일 포함
COPY --from=frontend-builder /build/dist ./frontend/dist

EXPOSE 8000
CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
