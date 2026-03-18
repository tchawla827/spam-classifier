# Email Spam Classifier

A production-style web application that classifies email text as spam or not spam using an ensemble of machine learning models.

## Overview

- **Frontend**: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + Pydantic
- **ML Pipeline**: Logistic Regression, Linear SVM, XGBoost, LightGBM with stacked ensemble
- **Architecture**: Monorepo (pnpm workspaces + Turbo)

## Structure

```
spam-classifier/
├── apps/
│   ├── web/        # Next.js frontend
│   └── api/        # FastAPI backend
├── packages/
│   ├── types/      # Shared TypeScript interfaces
│   └── config/     # Shared ESLint / TS config
├── ml/             # ML training, evaluation, and artifact export
├── infra/          # Docker, scripts, CI notes
└── docs/           # Architecture decisions and API docs
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.11+

### Install

```bash
pnpm install
```

### Development

```bash
# Frontend
pnpm dev

# Backend (from apps/api)
uvicorn app.main:app --reload --port 8000
```

### Lint and Format

```bash
pnpm lint
pnpm format
```

## Documentation

- [Architecture](ARCHITECTURE.md)
- [API Contracts](API_CONTRACTS.md)
- [Tasks](TASKS.md)
- [Security and Privacy](SECURITY_PRIVACY.md)
- [Dataset Notes](DATASET.md)

## Status

Phase 0 complete — monorepo setup. See [TASKS.md](TASKS.md) for full implementation progress.
