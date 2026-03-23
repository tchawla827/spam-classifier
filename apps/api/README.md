---
title: Spam Classifier API
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# Spam Classifier API

FastAPI backend for the spam classification service.

## Features

- Email spam classification with ML inference
- Rate limiting
- Authentication support
- Gmail integration (V2)
- Per-user history (V2)
- Feedback collection (V2)

## Development

### Setup

```bash
pip install -r requirements.txt
```

### Run locally

```bash
python -m uvicorn app.main:app --reload
```

### Health check

```bash
curl http://localhost:8000/api/v1/health
```

## API Endpoints

### V1 (Public)

- `GET /api/v1/health` - Health check
- `POST /api/v1/classify` - Classify email
- `GET /api/v1/models` - Get available models

### V2 (Authenticated)

- `POST /api/v2/auth/register` - User registration
- `POST /api/v2/auth/login` - User login
- `GET /api/v2/history` - Get classification history
- `POST /api/v2/feedback` - Submit feedback

## Environment Variables

See `.env` for configuration.
