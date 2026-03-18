# Implementation Tasks

## Phase 0 - Planning and Setup
- [x] Verify final product scope matches the PRD and Architecture documents.
- [x] Create monorepo root directory.
- [x] Initialize git repository in the root directory.
- [x] Create root `README.md` containing basic project information.
- [x] Create `.gitignore` to ignore `node_modules`, `venv`, `__pycache__`, `.env`, etc.
- [x] Create `.env.example` with placeholders for environment variables.
- [x] Initialize `pnpm` by creating a root `package.json`.
- [x] Create `pnpm-workspace.yaml` and configure it for `apps/*` and `packages/*`.
- [x] Create a base `turbo.json` or `Makefile` for task running.
- [x] Add basic format and lint scripts to the root `package.json`.
- [x] **Validation Checkpoint:** Ensure `pnpm install` runs without errors and workspace is recognized.

---

## Phase 1 - Monorepo Scaffolding
### Frontend scaffold
- [x] Create directory `apps/web`.
- [x] Initialize Next.js app with TypeScript inside `apps/web` (`npx create-next-app@latest .`).
- [x] Install Tailwind CSS in `apps/web`.
- [x] Install shadcn/ui and configure it in `apps/web`.
- [x] Install Recharts and Framer Motion in `apps/web`.
- [x] Set up the dark theme foundation in `tailwind.config.ts` and globals.
- [x] Create a basic landing page shell in `apps/web/app/page.tsx`.
- [x] **Validation Checkpoint:** Run `pnpm dev` in `apps/web` and verify the shell loads in browser.

### Backend scaffold
- [x] Create directory `apps/api`.
- [x] Initialize Python environment (e.g., `venv` or `poetry`) in `apps/api`.
- [x] Install FastAPI and Uvicorn in `apps/api`.
- [x] Create basic FastAPI application entrypoint in `apps/api/app/main.py`.
- [x] Create environment configuration loader (`apps/api/app/core/config.py`).
- [x] Add a basic health route (`GET /api/v1/health`).
- [x] Set up versioned router structure (`apps/api/app/api/v1`).
- [x] **Validation Checkpoint:** Run Uvicorn server locally and verify `/api/v1/health` returns `200 OK`.

### Shared packages scaffold
- [x] Create directory `packages/types`.
- [x] Create directory `packages/config`.
- [x] Add shared TypeScript configuration to `packages/config`.
- [x] Add shared lint configuration to `packages/config`.
- [x] **Validation Checkpoint:** Verify `apps/web` can import from `packages/config` or `packages/types` if linked.

### ML scaffold
- [x] Create directory `ml/`.
- [x] Create subdirectories: `ml/data/raw`, `interim`, `processed`.
- [x] Create subdirectories: `ml/src`, `ml/reports`, `ml/artifacts`.
- [x] Add a placeholder training entrypoint script `ml/src/training/orchestrate_training.py`.
- [x] Add a placeholder inference loader `ml/src/inference/predict.py`.
- [x] **Validation Checkpoint:** Run the placeholder python scripts to ensure the environment works.

---

## Phase 2 - Project Structure and Core Contracts
- [x] Define classification request Pydantic schema in API (`apps/api/app/schemas/classify.py`).
- [x] Define final classification response Pydantic schema in API.
- [x] Define individual model output schema and ensemble schema in API.
- [x] Define explanation schema in API.
- [x] Define mirroring TypeScript interfaces in `packages/types/index.ts` or `apps/web/types/api.ts`.
- [x] Create constants for model names (Logistic Regression, SVM, XGBoost, LightGBM, Ensemble).
- [x] Create constants for risk bands (low, medium, high).
- [x] Define standard error response format schema.
- [x] **Validation Checkpoint:** Write a simple unit test ensuring Pydantic schemas serialize correctly to the expected JSON shapes.

---

## Phase 3 - Dataset Layer
- [x] Define a unified dataset schema in `ml/src/datasets/common_schema.py`.
- [x] Implement adapter for the first email dataset.
- [x] Implement adapter for the second email dataset.
- [x] Implement cleaning utility (remove empty rows, invalid data) in `ml/src/preprocessing/text_cleaning.py`.
- [x] Implement deduplication utility.
- [x] Implement train/val/test split utility ensuring no leakage.
- [x] Write a script to export the processed datasets to `ml/data/processed/`.
- [x] **Validation Checkpoint:** Run the dataset preparation pipeline and inspect the output CSV/Parquet for correctness.

---

## Phase 4 - Feature Engineering
- [ ] Implement text concatenation strategy (combine subject and body).
- [ ] Implement text normalization utility (lowercase, strip special chars).
- [ ] Implement extraction of suspicious keyword features.
- [ ] Implement extraction of URL count features.
- [ ] Implement extraction of punctuation and count features.
- [ ] Implement extraction of uppercase/digit ratio features.
- [ ] Implement subject/body length features.
- [ ] Implement word-level TF-IDF vectorizer.
- [ ] Implement char-level TF-IDF vectorizer.
- [ ] Implement a Scikit-Learn `FeatureUnion` or `ColumnTransformer` Pipeline combining all features.
- [ ] **Validation Checkpoint:** Pass a sample dataframe through the feature pipeline and verify output shape/types.

---

## Phase 5 - Baseline Models
- [ ] Create training script for Logistic Regression baseline (`ml/src/training/train_logreg.py`).
- [ ] Create training script for Linear SVM baseline (`ml/src/training/train_svm.py`).
- [ ] Execute training for baselines on the predefined split.
- [ ] Save baseline evaluation metrics (Precision, Recall, F1).
- [ ] Compare baseline outputs programmatically.
- [ ] Export baseline model artifacts using `joblib`.
- [ ] **Validation Checkpoint:** Load the exported artifacts in a separate script and run a dummy `predict()` to ensure they load properly.

---

## Phase 6 - Ensemble Models
- [ ] Create training script for XGBoost model.
- [ ] Create training script for LightGBM model.
- [ ] Execute training for XGBoost and LightGBM.
- [ ] Implement probability calibration (e.g., `CalibratedClassifierCV`) for all base models.
- [ ] Collect out-of-fold cross-validation predictions from all base models.
- [ ] Train a stacking meta-model (e.g., Logistic Regression) on the collected out-of-fold predictions.
- [ ] Evaluate the full ensemble on the held-out test set.
- [ ] Generate and save a model comparison report.
- [ ] Export the final production artifact bundle (pipeline, models, stacker).
- [ ] **Validation Checkpoint:** Successfully load the full artifact bundle and verify the ensemble computes a final prediction.

---

## Phase 7 - Backend Inference Layer
- [ ] Implement startup artifact loading in FastAPI `lifespan` or startup event.
- [ ] Build the core Inference Service class/functions.
- [ ] Implement preprocessing adapter for converting API runtime input into the expected standard schema.
- [ ] Implement per-model prediction formatter logic (generating probabilities).
- [ ] Implement ensemble prediction formatting logic.
- [ ] Implement explanation generation (heuristic or feature-importance based).
- [ ] Implement the `POST /api/v1/classify` endpoint using the defined schemas and services.
- [ ] Implement request validation error handling in FastAPI.
- [ ] Add structured logging for inference requests.
- [ ] Implement the `GET /api/v1/models` endpoint for metadata.
- [ ] Implement error-safe fallback responses (graceful degradation).
- [ ] **Validation Checkpoint:** Call `/api/v1/classify` via `curl` or Postman with test data and verify the exact API contract is respected.

---

## Phase 8 - Frontend UI Foundation
- [ ] Build the main Next.js app shell layout (`apps/web/app/layout.tsx`).
- [ ] Define and apply dark premium design tokens in `tailwnd.config.ts` and CSS.
- [ ] Create a top navigation header component.
- [ ] Create the main classifier page layout structure.
- [ ] Build the `SubjectInput` component.
- [ ] Build the `BodyTextarea` component.
- [ ] Build the `ClassifyButton` component with disabled and loading states.
- [ ] Implement a "Sample Input" button that auto-fills fake spam/ham.
- [ ] Implement a "Clear/Reset" action button.
- [ ] **Validation Checkpoint:** Verify the frontend form renders properly, accepts input, and handles local state updates without crashing.

---

## Phase 9 - Frontend Results Experience
- [ ] Create the `FinalVerdictCard` component.
- [ ] Create a `RiskScoreDisplay` component mapping the probability to a visual gauge/bar.
- [ ] Create a `RiskBandBadge` component (Low, Medium, High).
- [ ] Create `ModelComparisonCard` components to list individual model confidences.
- [ ] Create a `ConfidenceBar` visual component for progress-bar style display.
- [ ] Create an `AgreementIndicator` component.
- [ ] Create an `ExplanationPanel` component for rendering text signals.
- [ ] Add Framer Motion animations for the result appearance sequence.
- [ ] Build the "Empty State" UI before classification is run.
- [ ] Build the "API Error" state UI for failed backend requests.
- [ ] Build validation error UI (e.g., highlighting empty fields).
- [ ] **Validation Checkpoint:** Mock the API response in frontend code and verify all result components render correctly based on the mock data.

---

## Phase 10 - Anonymous History
- [ ] Design the local storage history item schema (TypeScript interface).
- [ ] Implement local storage persistence logic for results.
- [ ] Build a history sidebar or dedicated `/history` page.
- [ ] Implement a summary preview card for saved history results.
- [ ] Add functionality to click a history item and restore it into the main view.
- [ ] Add functionality to delete individual history items.
- [ ] Add a "Clear all history" button.
- [ ] **Validation Checkpoint:** Run a classification, check the browser's Local Storage to ensure data saved, and test the reload behavior.

---

## Phase 11 - Basic Persistence (Optional for V1)
- [ ] Set up PostgreSQL connection logic in FastAPI using SQLAlchemy.
- [ ] Define SQLAlchemy database models for classification metadata.
- [ ] Configure Alembic for database migrations.
- [ ] Generate the initial migration for the classification metadata table.
- [ ] Add a table to store model version tracking metadata.
- [ ] Integrate database writing into the `/api/v1/classify` endpoint (store non-sensitive data).
- [ ] **Validation Checkpoint:** Check that `POST /api/v1/classify` does not block or heavily slow down response times when writing to the database.

---

## Phase 12 - Tests
- [ ] Add `pytest` for backend schemas.
- [ ] Add `pytest` for `GET /api/v1/health` and `POST /api/v1/classify` API routes.
- [ ] Add an ML smoke test verifying artifact bundle loading in isolation.
- [ ] Add an ML test verifying the inference pipeline outputs the expected shape natively.
- [ ] Add React Testing Library/Jest tests for form validation logic.
- [ ] Add a frontend component test ensuring the `VerdictCard` renders correctly.
- [ ] **Validation Checkpoint:** Run the entire test suite (`pytest` and `npm run test`) and ensure 100% pass rate.

---

## Phase 13 - Deployment
### Frontend
- [ ] Prepare `.env.production` variables in the frontend.
- [ ] Verify production build completes locally (`pnpm build`).
- [ ] Deploy frontend app to Vercel.

### Backend
- [ ] Create `Dockerfile` for the FastAPI backend encompassing the ML artifacts.
- [ ] Add a production startup command (using `gunicorn` + `uvicorn` workers).
- [ ] Configure deployment on Render (or equivalent platform).
- [ ] Verify the deployed `/health` endpoint works globally.
- [ ] Verify model artifacts are successfully bundled and loaded in the deployed container.

### Final
- [ ] Connect the deployed Vercel frontend to the deployed Render backend URL.
- [ ] Run an end-to-end production flow test (input -> classify -> results).
- [ ] Fix any CORS or mixed-content issues.
- [ ] Document free-tier cold-start latency mitigation strategies if needed.
- [ ] **Validation Checkpoint:** User can successfully visit the live URL and classify an email using the production backend.

---

## Phase 14 - Gmail-Ready Foundations (Do not fully implement in V1)
- [ ] Add placeholder route file for auth endpoints (`apps/api/app/api/v1/auth.py`).
- [ ] Add placeholder OAuth service class in backend.
- [ ] Define SQLAlchemy database models for future users and OAuth tokens.
- [ ] Add a privacy policy page content in the frontend (`apps/web/app/privacy/page.tsx`).
- [ ] Document token encryption utility plans in comments/docs.
- [ ] Document the intended disconnect/revoke flow for Gmail access.
- [ ] **Validation Checkpoint:** Ensure no active OAuth blocking code breaks V1 anonymous classification.

---

## Phase 15 - Polishing
- [ ] Refine loading skeletons for smoother perceived performance.
- [ ] Improve typography, contrast, and spacing across the app.
- [ ] Display the active model version cleanly in the application footer.
- [ ] Add metadata links to the frontend footer.
- [ ] Write a complete and comprehensive root `README.md` with instructions.
- [ ] Add screenshots or a demo GIF to the root `README.md`.
- [ ] Perform a final code cleanup (remove unused imports, redundant comments).
- [ ] Verify the final implementation strictly aligns with `ARCHITECTURE.md`.
- [ ] **Validation Checkpoint:** The project is presentation-ready and meets all requirements specified in the PRD.
