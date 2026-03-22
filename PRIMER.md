# PRIMER.md

This is the fast-orientation file for V2 work.

## What already exists in the repo

The current codebase is a working V1 monorepo with:

### Frontend
- Next.js app in `apps/web`
- interactive landing page
- 3D spam-toss hero
- manual subject/body classifier form
- verdict card with per-model breakdown
- anonymous local-storage history

### Backend
- FastAPI app in `apps/api`
- artifact loading at startup
- routes:
  - `GET /api/v1/health`
  - `POST /api/v1/classify`
  - `GET /api/v1/models`
- optional Postgres persistence
- classification metadata logging

### ML
- feature pipeline + inference bundle
- global ensemble serving path
- heuristic explanation generation
- exported artifacts loaded by backend

---

## Important current code anchors

These are the most important existing files to respect while implementing V2:

### Frontend anchors
- `apps/web/app/page.tsx`
- `apps/web/components/sections/Hero.tsx`
- `apps/web/components/sections/ClassifySection.tsx`
- `apps/web/components/classify/ClassifyForm.tsx`
- `apps/web/components/classify/VerdictCard.tsx`
- `apps/web/hooks/useClassifyHistory.ts`
- `apps/web/lib/api/classify.ts`

### Backend anchors
- `apps/api/app/main.py`
- `apps/api/app/api/v1/classify.py`
- `apps/api/app/api/v1/health.py`
- `apps/api/app/schemas/classify.py`
- `apps/api/app/db/models.py`
- `apps/api/app/db/session.py`

### ML anchors
- `ml/src/inference/predict.py`
- `ml/src/features/pipeline.py`
- `ml/src/features/handcrafted.py`
- `ml/src/utils/export_bundle.py`

---

## Current V1 behavior that must survive

These flows must continue to work after V2 merges:

1. User visits `/`
2. Landing page hero renders normally
3. User pastes subject/body manually
4. Frontend calls `POST /api/v1/classify`
5. Backend runs global inference
6. Result is shown with verdict/risk/agreement/explanations
7. Anonymous history continues to work locally

Also:
- app boots if Gmail is not configured
- backend boots if Gmail is not configured
- current ML bundle loading stays unchanged
- current health/models endpoints remain valid

---

## V2 product goal

Turn V1 into a real user product:

### From this
anonymous spam classification demo

### To this
authenticated, Gmail-connected, user-personalized spam assistant

---

## V2 core capabilities

### Must-have
- user accounts
- sessions
- per-user server history
- Gmail connect/disconnect
- fetch Gmail messages
- classify Gmail messages
- feedback on individual emails
- sender/domain override rules
- user sensitivity settings
- personalized adjustment layer over the global ensemble

### Nice differentiators
- uncertain/review band
- smart rule suggestions
- dashboard and insights
- explicit “why this result changed for you” messaging

---

## What personalization means in V2

Personalization is **not** full per-user retraining.

It is a layered decision system:

1. global ensemble score from the current model
2. user sensitivity threshold
3. sender/domain overrides
4. feedback-informed personalization adjustment
5. final decision and explanation

This keeps the architecture stable while making the product meaningfully adaptive.

---

## Main technical risks

### 1. Breaking V1 while adding auth
Mitigation:
- keep manual classify route valid
- keep anonymous frontend path alive
- use additive auth-aware UI

### 2. Overcoupling Gmail to core inference
Mitigation:
- Gmail is an input source, not a replacement for the classifier
- reuse the same classify service where possible

### 3. Storing too much sensitive data
Mitigation:
- metadata first
- explicit retention rules
- opt-in richer storage only where needed

### 4. Overcomplicated personalization
Mitigation:
- start with threshold + rules + lightweight score adjustment
- do not retrain the global ensemble per user

### 5. Drift between frontend and backend contracts
Mitigation:
- centralize contracts
- prefer shared types where practical
- test API responses explicitly

---

## Immediate V2 mental model

Think of V2 as adding five layers around the already-working V1 core:

- identity
- inbox data source
- per-user persistence
- feedback capture
- personalization logic

The current classifier stays the center.
