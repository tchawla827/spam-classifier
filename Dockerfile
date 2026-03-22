# Hugging Face Spaces deployment
# ── Stage 1: dependency builder ────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

COPY apps/api/requirements/base.txt requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Stage 2: runtime ───────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends curl libgomp1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /root/.local /root/.local
COPY apps/api/app ./app
COPY apps/api/alembic.ini ./alembic.ini
COPY apps/api/alembic ./alembic
COPY ml/src ./ml/src
COPY apps/api/start.sh ./start.sh
RUN chmod +x ./start.sh

RUN mkdir -p ml/artifacts && \
    curl -L -o /tmp/ml-bundle.tar.gz https://huggingface.co/tchawla827/email-spam-classifier/resolve/main/ml-bundle.tar.gz && \
    tar -xzf /tmp/ml-bundle.tar.gz -C ml/artifacts/ --no-same-owner && \
    rm -f /tmp/ml-bundle.tar.gz

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app
ENV ARTIFACT_BUNDLE_DIR=ml/artifacts/bundle
# HF Spaces requires port 7860
ENV PORT=7860

EXPOSE 7860

CMD ["./start.sh"]
