# Base Image: Python 3.11 Debian Bookworm (ARM64 compatible)
FROM python:3.11-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PATH="/root/.local/bin:$PATH"

# Install System Dependencies: Chromium & Chromedriver for ARM64
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    chromium \
    chromium-driver \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv for Python dependency management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Set Working Directory
WORKDIR /app

# 1. Copy package management files first (for Docker layer caching)
COPY pyproject.toml uv.lock* ./

# 2. Install dependencies (cached layer)
RUN uv sync

# 3. Install Playwright browser dependencies (cached layer)
RUN uv run playwright install chromium

# 4. Copy the rest of the application source code
COPY . .

# Expose Port 8000 for Backend FastAPI
EXPOSE 8000

# Default Command: Run FastAPI Backend
CMD ["/root/.local/bin/uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
