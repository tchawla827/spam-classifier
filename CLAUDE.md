# CLAUDE.md

You are working inside the existing `spam-classifier` monorepo.

## Your role

Implement V2 features on top of the current V1 codebase **without breaking V1**.

The repo already contains:
- Next.js frontend in `apps/web`
- FastAPI backend in `apps/api`
- ML inference/training pipeline in `ml`
- optional Postgres persistence
- deployed V1 manual classification flow
- interactive landing page and classifier demo

Your job is to extend the product into:
- authenticated accounts
- Gmail-connected workflows
- per-user history
- feedback collection
- rule-based overrides
- lightweight personalization on top of the global model

---

## Read-first policy

Before coding, read:
1. `PRIMER.md`
2. `RULES_V2.md`
3. `PRD_V2.md`
4. `ARCHITECTURE_V2.md`
5. `STRUCTURE_V2.md`
6. `API_CONTRACTS_V2.md`
7. `TESTS_V2.md`
8. `TASKS_V2.md`

Do not skip this.

---

## Non-negotiable product constraints

- Preserve the existing landing page and interactive hero.
- Preserve the existing anonymous manual classification workflow.
- Preserve these public routes:
  - `GET /api/v1/health`
  - `POST /api/v1/classify`
  - `GET /api/v1/models`
- Keep the current ML artifact loading flow intact.
- Do not require Gmail connection to use the manual classifier.
- Do not replace the global ensemble with per-user retraining.
- Treat personalization as an additional layer over the current model output.

---

## Engineering rules

### 1. Additive over destructive
Prefer:
- new modules
- new routes
- new tables
- new components
- new hooks/services

Avoid:
- deleting working V1 logic
- broad rewrites of stable code
- renaming public interfaces without migration

### 2. Compatibility first
Whenever touching existing files, explicitly protect:
- current API behavior
- current frontend route rendering
- current inference behavior
- current env defaults

### 3. Feature separation
Use clear boundaries:
- auth/session layer
- Gmail integration layer
- history layer
- feedback layer
- personalization layer
- existing inference layer

### 4. Privacy by default
Do not store raw email bodies indefinitely by default.
Prefer:
- metadata
- derived features
- expiring caches
- explicit opt-in for richer storage

### 5. Explainability
For personalized decisions, expose whether the outcome came from:
- global model
- user sensitivity threshold
- sender/domain override
- personalization adjustment layer

### 6. Safe rollouts
Keep the app usable in these states:
- anonymous, no DB extras
- authenticated, no Gmail
- authenticated, Gmail connected
- authenticated, personalization enabled

---

## Required implementation style

For each phase:
1. explain the phase goal
2. list impacted files
3. explain how V1 is preserved
4. implement
5. run validations
6. summarize outcome

If a phase is too large, split it into sub-steps, but stay within the documented V2 plan.

---

## Backend guidance

- Keep `apps/api/app/main.py` startup behavior stable.
- Keep ML loading from `ml/src/inference/predict.py` stable.
- New auth/Gmail code should live in new modules, not be mixed into core inference unnecessarily.
- Database changes must go through Alembic migrations.
- Protect manual classification from auth failures; it should keep working where intended.
- Prefer explicit service classes over route-heavy business logic.

---

## Frontend guidance

- Preserve the current `/` experience.
- Add authenticated UI without cluttering or weakening the current landing flow.
- Add a user-aware history sidebar.
- Do not regress accessibility or reduced-motion behavior.
- Separate anonymous history fallback from authenticated server history cleanly.

---

## ML/personalization guidance

- Keep the global artifact bundle untouched as the primary classifier.
- Add a personalization layer that adjusts or overrides final decisions.
- Support:
  - user sensitivity thresholds
  - sender/domain overrides
  - feedback-informed adjustment
- Do not require full model retraining for personalization.

---

## When in doubt

Choose the option that:
1. preserves V1
2. is more reversible
3. is more privacy-safe
4. is easier to test
5. keeps architecture modular
