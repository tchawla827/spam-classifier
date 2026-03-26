# SpamShield

<div align="center">

Intelligent email spam classification with a polished web app, FastAPI backend, ML ensemble inference, Gmail workflows, history, feedback, and personalization controls.

[Overview](#overview) | [Features](#features) | [Screenshots](#screenshots) | [Tech Stack](#tech-stack) | [Quick Start](#quick-start) | [Repository Layout](#repository-layout) | [API](#api) | [Documentation](#documentation)

</div>

---

## Overview

SpamShield is a monorepo with three main parts:

- `apps/web`: Next.js frontend for the landing page, interactive classifier, authenticated workspace, Gmail inbox scanning, history, insights, settings, and privacy flows.
- `apps/api`: FastAPI backend that serves classification, auth, history, Gmail, preferences, feedback, and insights endpoints.
- `ml`: training and inference pipeline for the spam-classification models and bundle tooling.

The app supports both anonymous usage and signed-in workflows:

- Anonymous users can classify pasted email subject/body content from the landing page.
- Signed-in users get account-aware history, feedback, insights, personalization settings, privacy controls, and optional Gmail inbox scanning.

---

## Features

### 1. Landing Page + Interactive Demo

- Marketing-style landing page with animated hero and product sections.
- Manual email classification directly from the homepage.
- Anonymous local history fallback for the manual classifier.

![Landing Page Placeholder](./docs/assets/placeholders/landing-page.png)

### 2. Manual Email Classification

- Submit `subject` and `body` text for spam detection.
- Returns final prediction, risk score, risk band, agreement ratio, explanations, and model metadata.
- Available to anonymous users and authenticated users.

![Manual Classification Placeholder](./docs/assets/placeholders/manual-classification.png)

### 3. Authenticated Workspace

- Dedicated `/app` experience after sign-in.
- Quick links to classify, history, Gmail, insights, settings, and privacy.
- User-aware dashboard cards and navigation.

![Workspace Placeholder](./docs/assets/placeholders/workspace-dashboard.png)

### 4. Classification History

- Server-backed history for signed-in users.
- Search, filter, detail drawer, feedback actions, item deletion, and clear-all flow.
- Includes both manual and Gmail-origin classifications.

![History Placeholder](./docs/assets/placeholders/history.png)

### 5. Gmail Inbox Scanning

- Optional Gmail connection flow.
- Read-only inbox access for supported/test users.
- Search messages, select one or many, and classify inbox emails in-app.

![Gmail Placeholder](./docs/assets/placeholders/gmail-inbox.png)

### 6. Feedback + Personalization Controls

- Submit feedback on classifications.
- Configure detection sensitivity.
- Manage sender and domain rules.
- Reset personalization, disconnect Gmail, clear history, or delete the account from Settings.

![Settings Placeholder](./docs/assets/placeholders/settings.png)

### 7. Insights + Privacy

- Workspace insights for totals, spam caught, false positives, and review counts.
- Dedicated privacy page describing Gmail data handling, retention, and deletion controls.

![Insights Placeholder](./docs/assets/placeholders/insights.png)

![Privacy Placeholder](./docs/assets/placeholders/privacy.png)

---





## Tech Stack

### Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- React Three Fiber / Drei

### Backend

- FastAPI
- Python 3.11+
- Alembic
- Optional database-backed persistence

### Machine Learning

- Scikit-learn
- XGBoost / LightGBM tooling in the training pipeline
- Shared artifact bundle loading for inference

### Monorepo Tooling

- pnpm workspaces
- Turborepo

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Python 3.11+

### 1. Install frontend workspace dependencies

```bash
pnpm install
```

### 2. Run the web app

```bash
pnpm --filter web dev
```

Open `http://localhost:3000`.

### 3. Run the API

```bash
cd apps/api
pip install -r requirements/base.txt
python -m uvicorn app.main:app --reload
```

Open `http://localhost:8000/api/v1/health`.

### 4. Monorepo commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm --filter web test
```

Note: the repository currently has existing build/test issues outside this README update. The commands above reflect the intended workflow and available scripts.

---

## Environment and Secrets

Use [.env.example](./.env.example) as the source of truth for environment variables.

Do not commit:

- OAuth client secrets
- database passwords
- runtime `.env` files
- generated logs or local artifacts

Runtime secrets should live in local `.env` files or your deployment platform's secret manager.

---

## Repository Layout

```text
spam-classifier/
|-- apps/
|   |-- web/        # Next.js frontend
|   `-- api/        # FastAPI backend
|-- ml/             # training, datasets, inference, utilities
|-- packages/
|   |-- types/      # shared TypeScript contracts
|   `-- config/     # shared config packages
|-- docs/             # Architecture, API, Setup, DB, ML, Deployment
|-- scripts/
`-- README.md
```

---

## API

The backend mounts all routes under `/api/v1`.

### Core endpoints

- `GET /api/v1/health`
- `POST /api/v1/classify`

### Additional implemented route groups

- `/api/v1/auth`
- `/api/v1/history`
- `/api/v1/feedback`
- `/api/v1/preferences`
- `/api/v1/gmail`
- `/api/v1/insights`
- `/api/v1/account`

For request/response contracts, see [docs/API.md](./docs/API.md).

---

## Documentation

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md): system architecture and component overview
- [docs/API.md](./docs/API.md): full API reference with request/response examples
- [docs/SETUP.md](./docs/SETUP.md): local development setup and Google OAuth configuration
- [docs/DATABASE.md](./docs/DATABASE.md): database schema and entity relationships
- [docs/ML.md](./docs/ML.md): ML pipeline, ensemble design, and training instructions
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md): Docker and Render deployment guide

---

## Notes

- Gmail support is optional and depends on valid Google OAuth configuration.
- Persistence-backed features depend on database configuration.
- The app is designed to keep manual classification usable even when advanced integrations are not configured.
