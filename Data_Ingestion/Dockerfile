FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc g++ libxml2-dev libxslt1-dev libffi-dev \
        libjpeg-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


FROM python:3.11-slim

LABEL maintainer="rajsingh"
LABEL service="data-ingestion"

WORKDIR /app

# Minimal runtime libraries for lxml / Pillow / newspaper3k
RUN apt-get update && apt-get install -y --no-install-recommends \
        libxml2 libxslt1.1 libjpeg62-turbo zlib1g curl \
    && rm -rf /var/lib/apt/lists/*


COPY --from=builder /install /usr/local

COPY . .

RUN python -c "import nltk; nltk.download('punkt_tab', quiet=True)" 2>/dev/null || true

RUN groupadd -r ingestion && useradd -r -g ingestion -d /app ingestion \
    && chown -R ingestion:ingestion /app
USER ingestion


EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8002/docs || exit 1


CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
