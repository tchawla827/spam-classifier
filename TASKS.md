# Implementation Tasks

## Phase 0 - Planning and Setup
- [ ] Confirm final product scope matches docs
- [ ] Create monorepo root
- [ ] Initialize git repository
- [ ] Add root README.md
- [ ] Add `.gitignore`
- [ ] Add `.env.example`
- [ ] Choose package manager (`pnpm`)
- [ ] Configure workspace file
- [ ] Add root formatting/lint scripts
- [ ] Add base Makefile or task runner scripts

---

## Phase 1 - Monorepo Scaffolding
### Frontend scaffold
- [ ] Create `apps/web`
- [ ] Initialize Next.js app with TypeScript
- [ ] Install Tailwind CSS
- [ ] Install shadcn/ui
- [ ] Install Recharts
- [ ] Install Framer Motion
- [ ] Set up dark theme foundation
- [ ] Create basic landing page shell

### Backend scaffold
- [ ] Create `apps/api`
- [ ] Initialize FastAPI app
- [ ] Add basic application entrypoint
- [ ] Add environment config loader
- [ ] Add health route
- [ ] Add API versioned router structure

### Shared packages scaffold
- [ ] Create `packages/types`
- [ ] Create `packages/config`
- [ ] Add shared TS config
- [ ] Add shared lint config

### ML scaffold
- [ ] Create `ml/` directory layout
- [ ] Add folders for data, src, reports, artifacts
- [ ] Add placeholder training entrypoint
- [ ] Add placeholder inference artifact loader

---

## Phase 2 - Project Structure and Core Contracts
- [ ] Define classification request schema
- [ ] Define model output schema
- [ ] Define ensemble output schema
- [ ] Define explanation schema
- [ ] Define full classify response schema
- [ ] Mirror API response types in frontend if needed
- [ ] Add constants for model names
- [ ] Add constants for risk bands
- [ ] Add error response format

---

## Phase 3 - Dataset Layer
- [ ] Create unified dataset schema in ML code
- [ ] Add adapter for first email dataset
- [ ] Add adapter for second email dataset
- [ ] Add adapter for third email dataset if used
- [ ] Add cleaning utility for empty/invalid rows
- [ ] Add deduplication utility
- [ ] Add train/val/test split utility
- [ ] Add leakage prevention checks
- [ ] Export processed dataset files

---

## Phase 4 - Feature Engineering
- [ ] Implement subject/body concatenation strategy
- [ ] Implement text normalization utility
- [ ] Implement suspicious keyword feature extraction
- [ ] Implement URL count feature
- [ ] Implement punctuation/count features
- [ ] Implement uppercase/digit ratio features
- [ ] Implement subject/body length features
- [ ] Implement TF-IDF word vectorizer
- [ ] Implement TF-IDF char vectorizer
- [ ] Implement feature union pipeline

---

## Phase 5 - Baseline Models
- [ ] Train Logistic Regression baseline
- [ ] Train Linear SVM baseline
- [ ] Save baseline metrics
- [ ] Compare baseline outputs
- [ ] Export baseline artifacts

---

## Phase 6 - Ensemble Models
- [ ] Train XGBoost model
- [ ] Train LightGBM model
- [ ] Add calibration for each model
- [ ] Collect out-of-fold predictions
- [ ] Train stacking meta-model
- [ ] Evaluate ensemble on held-out test set
- [ ] Save model comparison report
- [ ] Export final production artifact bundle

---

## Phase 7 - Backend Inference Layer
- [ ] Implement startup model loading
- [ ] Implement inference service
- [ ] Implement preprocessing adapter for runtime input
- [ ] Implement per-model prediction formatting
- [ ] Implement ensemble prediction formatting
- [ ] Implement explanation generator
- [ ] Implement `/api/v1/classify`
- [ ] Add request validation errors
- [ ] Add structured logging
- [ ] Add `/api/v1/models`
- [ ] Add error-safe fallback responses

---

## Phase 8 - Frontend UI Foundation
- [ ] Build app shell layout
- [ ] Define dark premium design tokens
- [ ] Create top navigation/header
- [ ] Create classifier page layout
- [ ] Create subject input component
- [ ] Create body textarea component
- [ ] Create classify button with loading state
- [ ] Create sample input action
- [ ] Create clear/reset action

---

## Phase 9 - Frontend Results Experience
- [ ] Create final verdict card
- [ ] Create risk score display
- [ ] Create risk band badge
- [ ] Create per-model comparison cards
- [ ] Create confidence bar component
- [ ] Create agreement indicator
- [ ] Create explanation panel
- [ ] Add animation for result appearance
- [ ] Add empty state
- [ ] Add API error state
- [ ] Add validation error UI

---

## Phase 10 - Anonymous History
- [ ] Design local history item shape
- [ ] Persist results to browser storage
- [ ] Build history sidebar or page
- [ ] Show summary preview for saved results
- [ ] Allow reopening previous result
- [ ] Allow deleting local history items
- [ ] Add "clear all history" action

---

## Phase 11 - Basic Persistence (Optional for V1)
- [ ] Set up PostgreSQL connection
- [ ] Add SQLAlchemy models
- [ ] Add Alembic migrations
- [ ] Create classification metadata table
- [ ] Store non-sensitive inference metadata
- [ ] Add model version table
- [ ] Verify DB writes do not block inference path

---

## Phase 12 - Tests
- [ ] Add backend unit tests for schemas
- [ ] Add backend tests for classify endpoint
- [ ] Add ML smoke test for artifact loading
- [ ] Add ML test for inference output shape
- [ ] Add frontend component test for result card
- [ ] Add frontend test for form validation
- [ ] Add end-to-end smoke path if time permits

---

## Phase 13 - Deployment
### Frontend
- [ ] Prepare environment variables
- [ ] Configure build output
- [ ] Deploy to Vercel

### Backend
- [ ] Add Dockerfile
- [ ] Add production startup command
- [ ] Configure Render deployment
- [ ] Verify health endpoint
- [ ] Verify model artifacts available in deploy target

### Final
- [ ] Connect frontend to deployed backend
- [ ] Test end-to-end production flow
- [ ] Fix CORS / environment issues
- [ ] Validate free-tier cold-start UX

---

## Phase 14 - Gmail-Ready Foundations (Do not fully implement in V1)
- [ ] Add placeholder auth route structure
- [ ] Add placeholder OAuth service module
- [ ] Define future user and oauth DB models
- [ ] Add privacy page content
- [ ] Add token encryption utility placeholder
- [ ] Add disconnect/revoke flow notes in docs

---

## Phase 15 - Polishing
- [ ] Improve loading skeletons
- [ ] Improve typography and spacing
- [ ] Add model/version display
- [ ] Add metadata footer
- [ ] Write complete README
- [ ] Add screenshots or demo GIF
- [ ] Final code cleanup
- [ ] Final architecture consistency check
