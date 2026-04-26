# Use a slim Python image for efficiency
FROM python:3.11-slim

# Install system dependencies for Postgres and Playwright
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python requirements
COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# Install Playwright browsers (needed for the worker)
RUN playwright install --with-deps chromium

# Copy the rest of the source code
COPY . .

# Expose the API port
EXPOSE 8000

# We define the default command in docker-compose instead