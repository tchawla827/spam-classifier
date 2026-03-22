# System Architecture

## 1. High-Level Overview
This project is a monorepo with three core layers:

1. `web` - frontend application
2. `api` - backend inference and persistence layer
3. `ml` - data processing, model training, evaluation, artifact export

The system is designed so that V1 uses manual subject/body input, while V2 can add Gmail integration without reworking the core inference pipeline.

---

## 2. System Components

## 2.1 Frontend (Next.js)
Responsibilities:
- render dark premium UI
- collect subject/body input
- call classification API
- display final and per-model results
- manage loading/error states
- store anonymous local history
- later host Gmail connect UI

Core modules:
- classifier form
- result cards
- model comparison panel
- explanation panel
- history view

---

## 2.2 Backend API (FastAPI)
Responsibilities:
- validate requests
- load inference pipeline
- run model inference
- return structured response
- expose model metadata / health endpoints
- optionally persist classification metadata
- later manage Gmail OAuth and secure token flow

Core modules:
- request/response schemas
- inference service
- explanation service
- history service
- future oauth service

---

## 2.3 ML Core
Responsibilities:
- load datasets
- normalize into common schema
- build preprocessing pipeline
- train base models
- calibrate outputs
- train stacking ensemble
- evaluate performance
- export model artifacts for backend serving

Core modules:
- dataset adapters
- preprocessing
- feature engineering
- training
- calibration
- evaluation
- export

---

## 2.4 Database
Responsibilities:
- store classification metadata
- store model version metadata
- later store users and OAuth account records
- later store feedback and audit events

For V1, this can be minimal.

---

## 3. Architecture Diagram (Conceptual)

User
→ Frontend UI
→ FastAPI `/classify`
→ Inference Service
→ Preprocessing Pipeline
→ Base Models + Calibrators
→ Stacking Ensemble
→ Explanation Generator
→ JSON Response
→ Frontend Results UI

---

## 4. Data Flow (Step-by-Step)

## 4.1 Inference Flow
1. User enters `subject` and `body`
2. Frontend validates non-empty total content
3. Frontend sends POST request to `/api/v1/classify`
4. API validates payload using Pydantic
5. API generates request ID
6. Inference service builds combined feature input
7. Pipeline extracts:
   - word TF-IDF
   - char TF-IDF
   - engineered features
8. Each base model predicts:
   - label
   - calibrated confidence
9. Ensemble model computes final result
10. Explanation service extracts top signals
11. API returns structured response
12. Frontend renders:
   - final verdict
   - risk band
   - model comparison
   - explanations
13. Frontend stores result in local history

---

## 4.2 Training Flow
1. Raw public datasets are downloaded into `ml/data/raw`
2. Dataset adapters convert each dataset into a unified schema
3. Cleaning step removes duplicates / invalid rows
4. Split logic creates train/validation/test sets with leakage-aware strategy
5. Feature pipeline is fit on training data
6. Base models are trained
7. Base models are calibrated
8. Out-of-fold predictions are collected
9. Stacking model is trained
10. Evaluation reports are generated
11. Best artifacts are exported for inference use

---

## 4.3 Future Gmail Flow
1. User signs in
2. User connects Google account
3. Backend handles OAuth callback
4. Tokens are stored encrypted
5. User requests Gmail message list
6. Backend fetches selected message metadata/content
7. Message content is classified through same inference pipeline
8. App displays results
9. Raw email body is not persisted by default

---

## 5. API Design

## 5.1 `POST /api/v1/classify`
Purpose:
- classify input email text

Request body:
```json
{
  "subject": "Urgent: verify your account",
  "body": "Your mailbox will be suspended unless...",
  "mode": "email"
}
```

Response body:
```json
{
  "request_id": "uuid",
  "final_prediction": "spam",
  "final_risk_score": 0.94,
  "risk_band": "high",
  "agreement_ratio": 1.0,
  "models": [
    {
      "name": "logistic_regression",
      "prediction": "spam",
      "confidence": 0.91
    }
  ],
  "ensemble": {
    "name": "stacked_ensemble",
    "prediction": "spam",
    "confidence": 0.94
  },
  "explanations": {
    "top_signals": [
      "urgent verification language",
      "suspicious account warning"
    ]
  },
  "model_version": "email-spam-v1.0.0",
  "timestamp": "ISO-8601"
}
```

---

## 5.2 `GET /api/v1/health`
Purpose:
- health check

Response:
```json
{
  "status": "ok"
}
```

---

## 5.3 `GET /api/v1/models`
Purpose:
- list active model/version info

Response:
```json
{
  "channel": "email",
  "version": "email-spam-v1.0.0",
  "models": [
    "logistic_regression",
    "linear_svm",
    "xgboost",
    "lightgbm",
    "stacked_ensemble"
  ]
}
```

---

## 5.4 Future APIs
- `POST /api/v1/feedback`
- `GET /api/v1/history`
- `GET /api/v1/auth/google/start`
- `GET /api/v1/auth/google/callback`
- `POST /api/v1/gmail/classify-selected`
- `POST /api/v1/gmail/disconnect`

---

## 6. Data Model Reasoning

## 6.1 Unified Email Input
Use separate fields:
- `subject`
- `body`

Reason:
- preserves stronger subject-specific signal
- maps cleanly to Gmail later
- supports better feature engineering and explanations

---

## 6.2 ML Design
Base models:
- Logistic Regression
- Linear SVM
- XGBoost
- LightGBM

Meta model:
- Logistic Regression stacker

Reason:
- strong performance on sparse text tasks
- efficient on free-tier infrastructure
- explainable enough for product UI
- supports per-model confidence comparison

---

## 6.3 Confidence Design
Do not expose raw margins or uncalibrated scores as “confidence”.

Use:
- calibrated probabilities
- risk band logic

Reason:
- safer interpretation
- more trustworthy UI
- more production-like behavior

---

## 7. Tech Stack With Reasoning

## 7.1 Frontend
### Next.js + TypeScript
Reason:
- production-grade React framework
- clean routing and page structure
- easy deployment
- strong dev tooling

### Tailwind CSS
Reason:
- fast UI development
- consistent design system
- easy dark theme implementation

### shadcn/ui
Reason:
- high-quality composable UI primitives
- clean premium look without heavy custom component burden

### Recharts
Reason:
- easy confidence visualizations
- lightweight enough for MVP dashboards

### Framer Motion
Reason:
- subtle premium animations for cards and transitions

---

## 7.2 Backend
### FastAPI
Reason:
- clean schema-first API design
- excellent Python fit for ML serving
- simple async-friendly architecture

### Pydantic
Reason:
- strict validation
- shared typed response contracts

### SQLAlchemy + Alembic
Reason:
- standard Python DB approach
- future-proof for auth/history/oauth tables

---

## 7.3 ML
### scikit-learn
Reason:
- ideal for sparse text pipelines
- easy composition of preprocessing + models

### XGBoost / LightGBM
Reason:
- strong tabular/sparse hybrid model options
- useful as ensemble diversity

### Optuna
Reason:
- efficient tuning if needed later
- keep tuning isolated, not mandatory for first baseline

### joblib
Reason:
- simple artifact export/loading for pipeline objects

---

## 7.4 Database
### PostgreSQL
Reason:
- robust default relational choice
- works for metadata, auth, history, feedback

---

## 7.5 Deployment
### Vercel (frontend)
Reason:
- easiest Next.js deployment path

### Render (backend)
Reason:
- simple Docker/Python deployment for MVP

### Free-tier Postgres provider
Reason:
- enough for metadata persistence in MVP

---

## 8. Security Architecture
V1:
- no auth required
- local history only by default
- input validation
- rate limiting placeholder
- no sensitive tokens stored

V2:
- user auth required for Gmail
- encrypted OAuth token storage
- minimal Gmail scopes
- disconnect/revoke flow
- no raw email body storage by default

---

## 9. Scalability Notes
- keep inference service isolated from route handlers
- keep model artifacts versioned
- keep shared schemas under reusable package if needed
- avoid hardcoding dataset-specific logic into runtime inference
- preserve stable API contracts from day one

---

## 10. Final Architectural Principle
Design V1 so it is complete on its own, but every boundary should make V2 possible without rewrites.
