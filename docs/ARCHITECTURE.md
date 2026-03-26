# Architecture

SpamShield is a monorepo with three independently deployable pieces: a Next.js frontend, a FastAPI backend, and an ML pipeline.

---

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                    apps/web (Next.js)                   │
│  Landing page  │  /app workspace  │  Auth callback      │
└───────────────────────┬─────────────────────────────────┘
                        │  HTTP / cookies
┌───────────────────────▼─────────────────────────────────┐
│                   apps/api (FastAPI)                     │
│  classify  │  auth  │  history  │  gmail  │  insights   │
└─────┬────────────────────┬────────────────────┬─────────┘
      │                    │                    │
┌─────▼─────┐    ┌─────────▼────────┐  ┌───────▼────────┐
│ ml bundle │    │   PostgreSQL DB  │  │  Google APIs   │
│ (joblib)  │    │  (optional)      │  │  OAuth + Gmail │
└───────────┘    └──────────────────┘  └────────────────┘
```

---

## Frontend — `apps/web`

Next.js 15 app using the App Router.

### Route structure

| Route | Description |
|-------|-------------|
| `/` | Landing page with animated hero, manual classifier, feature sections |
| `/app` | Authenticated workspace dashboard |
| `/app/classify` | Manual classifier (authenticated view) |
| `/app/history` | Per-user classification history |
| `/app/gmail` | Gmail inbox browsing and classification |
| `/app/insights` | Usage stats and spam metrics |
| `/app/settings` | Preferences, rules, Gmail connection, account actions |
| `/app/how-it-works` | Explanation page for the ML pipeline |
| `/auth/callback` | OAuth redirect landing page |
| `/privacy` | Privacy policy for Gmail data handling |

### Key component groups

- **`components/hero/`** — 3D spam-toss scene (React Three Fiber), accessible controls, status display
- **`components/classify/`** — classification form, verdict card, feedback controls, quick rule actions
- **`components/history/`** — history panel, item cards, empty state, toggle button
- **`components/gmail/`** — Gmail message list, row, classify result
- **`components/sections/`** — landing page sections (Hero, HowItWorks, WhyItMatters, etc.)
- **`components/layout/`** — header, ambient background, landing redirect

### State and data fetching

- **`contexts/AuthContext.tsx`** — global auth state, loads `/api/v1/me` on mount
- **`hooks/useAuth.ts`** — exposes `user`, `loading`, `login`, `logout`
- **`hooks/useHistory.ts`** — server history for authenticated users
- **`hooks/useClassifyHistory.ts`** — localStorage fallback for anonymous history
- **`hooks/useGmail.ts`** — Gmail message fetch and classification actions
- **`lib/api/`** — typed fetch wrappers for each API group

### Authentication flow

1. User clicks "Sign in" → frontend calls `GET /api/v1/auth/google/start`
2. Backend returns a Google OAuth URL → frontend redirects to it
3. Google redirects back to `GET /api/v1/auth/google/callback` (backend)
4. Backend issues a session cookie and redirects to `/auth/callback`
5. `/auth/callback` page calls `/api/v1/me` and hydrates `AuthContext`

Session is stored as an HTTP-only cookie (`spam_session`). The middleware in `middleware.ts` redirects unauthenticated users away from `/app/*` routes.

---

## Backend — `apps/api`

FastAPI application with async SQLAlchemy for persistence.

### Startup

`app/main.py` lifespan:
1. Validates runtime secrets (refuses to start if OAuth is configured but `SESSION_SECRET_KEY` is default)
2. Loads the ML artifact bundle from `ml/artifacts/bundle/` into `app.state.artifacts`
3. Initialises the SQLAlchemy engine against `DATABASE_URL` (optional)

If the ML bundle fails to load, the classify endpoint returns 503 but other routes still work. If `DATABASE_URL` is not set, all persistence-backed features are disabled but manual classification still works.

### Route groups

All routes are prefixed with `/api/v1`.

| Router | File | Notes |
|--------|------|-------|
| health | `api/v1/health.py` | `GET /health` — always returns 200 |
| classify | `api/v1/classify.py` | `POST /classify`, `GET /models` |
| auth | `api/v1/auth.py` | Google OAuth start/callback, logout, `/me` |
| history | `api/v1/history.py` | Paginated history CRUD |
| feedback | `api/v1/feedback.py` | Submit/delete feedback on classifications |
| preferences | `api/v1/preferences.py` | Sensitivity and personalization settings |
| gmail | `api/v1/gmail.py` | Gmail connect, messages, classify |
| insights | `api/v1/insights.py` | Per-user summary stats |
| account | `api/v1/account.py` | Account deletion and data export |

### Service layer

Business logic lives in `app/services/` — routes are thin.

| Service | Responsibility |
|---------|---------------|
| `auth_service` | Google token exchange, user upsert |
| `session_service` | Session token hashing, cookie management |
| `oauth_state_service` | CSRF state for OAuth flows |
| `classification_service` | Wraps `ml.predict`, applies personalization, persists event |
| `personalization_service` | Applies sensitivity threshold, sender/domain overrides, feedback adjustment |
| `gmail_service` | Orchestrates Gmail message fetch and classify |
| `gmail_client` | Low-level Gmail API calls |
| `gmail_oauth_service` | Gmail OAuth connect/callback/disconnect |
| `gmail_message_mapper` | Maps Gmail API response to internal schema |
| `history_service` | History CRUD with cursor-based pagination |
| `feedback_service` | Feedback upsert, rule suggestion, personalization profile update |
| `preferences_service` | Read/write user preferences |
| `rules_service` | Sender and domain override CRUD and lookup |
| `insights_service` | Aggregated stats queries |
| `privacy_service` | Account deletion and data wipe |

### Dependency injection

`app/api/deps.py` provides:
- `get_current_user` — extracts and validates session cookie, raises 401 on failure
- `get_optional_user` — same but returns `None` instead of raising (used by classify)

---

## Machine Learning — `ml`

### Inference path (production)

The backend uses the pre-built artifact bundle at `ml/artifacts/bundle/`. It never re-trains at runtime.

```
POST /classify
    → classification_service.classify_manual()
        → ml.src.inference.predict.predict()
            → feature_pipeline.transform(subject, body)
            → base model probabilities (logreg, svm, cnb, xgb, lgbm)
            → stacker.predict_proba(base_probas)
            → heuristic explanations
        → personalization_service.personalize()  (if authenticated)
        → persist ClassificationEvent  (if DB available)
```

### Ensemble models

The ensemble uses a stacking meta-learner over five calibrated base models:

| Key | Display name |
|-----|-------------|
| `logreg_calibrated` | logistic_regression |
| `svm_calibrated` | linear_svm |
| `cnb_calibrated` | complement_naive_bayes (internal only) |
| `xgb_calibrated` | xgboost |
| `lgbm_calibrated` | lightgbm |

The stacker takes the raw probability outputs of all five base models as features and produces the final `final_risk_score`.

### Training pipeline

`ml/src/training/` contains individual trainers per model and an orchestrator. The pipeline:
1. Loads the merged dataset (`ml/src/datasets/`)
2. Extracts features via `ml/src/features/pipeline.py` (TF-IDF + handcrafted features)
3. Trains and calibrates each base model
4. Builds OOF predictions for the stacker
5. Trains the stacker
6. Exports the bundle with `ml/src/utils/export_bundle.py`

### Datasets

Seven public spam corpora are supported via individual adapters in `ml/src/datasets/`:
- Enron (two variants)
- LingSpam
- SpamAssassin
- TREC
- Nazario phishing
- Fraudulent emails

---

## Personalization layer

Personalization is a post-inference adjustment layer, not a per-user retrained model.

Decision order (short-circuits at first match):

1. **Sender override** — if the sender is in the user's trust/block list → forced verdict
2. **Domain override** — if the sender domain matches a rule → forced verdict
3. **Feedback adjustment** — `score_adjustment` from `PersonalizationProfile` shifts the score ±0.15 max
4. **Sensitivity threshold** — `relaxed` (0.65), `balanced` (0.50), `strict` (0.35)
5. **Review band** — if adjusted score is within ±0.1 of threshold → `review_state = "review"`

The `personalization_reasons` array in the response identifies which layer(s) affected the result.

---

## Database

PostgreSQL accessed via async SQLAlchemy. Migrations are managed with Alembic.

See [DATABASE.md](./DATABASE.md) for the full schema.

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Docker and Render deployment details.
