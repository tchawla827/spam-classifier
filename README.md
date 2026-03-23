---
title: Spam Classifier API
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# Spam Classifier

An intelligent email spam classification system with machine learning inference, authentication, Gmail integration, and personalization.

## Features

### V1 (Public)
- Email spam classification with ML ensemble model
- Anonymous manual classification
- Public API endpoints
- Interactive demo interface

### V2 (Coming Soon)
- User authentication & accounts
- Gmail integration for inbox classification
- Per-user classification history
- Feedback collection
- Personalization & sensitivity thresholds
- Sender/domain rule-based overrides

## Quick Start

### API

```bash
cd apps/api
pip install -r requirements/base.txt
python -m uvicorn app.main:app --reload
```

Visit `http://localhost:8000/api/v1/health` to verify.

### Web

```bash
cd apps/web
npm install
npm run dev
```

Visit `http://localhost:3000` to see the interactive demo.

## API Endpoints

### Public (V1)
- `GET /api/v1/health` - Health check
- `POST /api/v1/classify` - Classify email text
- `GET /api/v1/models` - Get available models

### Authenticated (V2)
- `POST /api/v2/auth/register` - User registration
- `POST /api/v2/auth/login` - User login
- `GET /api/v2/history` - Classification history
- `POST /api/v2/feedback` - Submit feedback

## Architecture

- **Frontend**: Next.js + React (TypeScript)
- **Backend**: FastAPI (Python)
- **ML**: Scikit-learn ensemble + XGBoost
- **Database**: PostgreSQL (optional)

## Documentation

See the docs directory for detailed documentation:
- `PRIMER.md` - Project overview
- `ARCHITECTURE_V2.md` - System design
- `API_CONTRACTS_V2.md` - API specifications
- `PRD_V2.md` - Product requirements

## License

MIT
