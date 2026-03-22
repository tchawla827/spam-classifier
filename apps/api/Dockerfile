# ── Stage 1: dependency builder ────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

COPY apps/api/requirements/base.txt requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Stage 2: runtime ───────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application source
COPY apps/api/app ./app

# Copy Alembic migration files
COPY apps/api/alembic.ini ./alembic.ini
COPY apps/api/alembic ./alembic

# Download & extract ML artifact bundle from Hugging Face (pre-trained models baked into image)
RUN mkdir -p ml/artifacts && \
    curl -L https://huggingface.co/tchawla827/email-spam-classifier/resolve/main/ml-bundle.tar.gz | \
    tar -xz -C ml/artifacts/

# Copy production startup script
COPY apps/api/start.sh ./start.sh
RUN chmod +x ./start.sh

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app
ENV ARTIFACT_BUNDLE_DIR=ml/artifacts/bundle

EXPOSE 8000

CMD ["./start.sh"]
