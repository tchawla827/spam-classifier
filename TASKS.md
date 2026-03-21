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
- [x] Implement text concatenation strategy (combine subject and body).
- [x] Implement text normalization utility (lowercase, strip special chars).
- [x] Implement extraction of suspicious keyword features.
- [x] Implement extraction of URL count features.
- [x] Implement extraction of punctuation and count features.
- [x] Implement extraction of uppercase/digit ratio features.
- [x] Implement subject/body length features.
- [x] Implement word-level TF-IDF vectorizer.
- [x] Implement char-level TF-IDF vectorizer.
- [x] Implement a Scikit-Learn `FeatureUnion` or `ColumnTransformer` Pipeline combining all features.
- [x] **Validation Checkpoint:** Pass a sample dataframe through the feature pipeline and verify output shape/types.

---

## Phase 5 - Baseline Models
- [x] Create training script for Logistic Regression baseline (`ml/src/training/train_logreg.py`).
- [x] Create training script for Linear SVM baseline (`ml/src/training/train_svm.py`).
- [x] Execute training for baselines on the predefined split.
- [x] Save baseline evaluation metrics (Precision, Recall, F1).
- [x] Compare baseline outputs programmatically.
- [x] Export baseline model artifacts using `joblib`.
- [x] **Validation Checkpoint:** Load the exported artifacts in a separate script and run a dummy `predict()` to ensure they load properly.

---

## Phase 6 - Ensemble Models
- [x] Create training script for XGBoost model.
- [x] Create training script for LightGBM model.
- [x] Execute training for XGBoost and LightGBM.
- [x] Implement probability calibration (e.g., `CalibratedClassifierCV`) for all base models.
- [x] Collect out-of-fold cross-validation predictions from all base models.
- [x] Train a stacking meta-model (e.g., Logistic Regression) on the collected out-of-fold predictions.
- [x] Evaluate the full ensemble on the held-out test set.
- [x] Generate and save a model comparison report.
- [x] Export the final production artifact bundle (pipeline, models, stacker).
- [x] **Validation Checkpoint:** Successfully load the full artifact bundle and verify the ensemble computes a final prediction.

---

## Phase 7 - Backend Inference Layer
- [x] Implement startup artifact loading in FastAPI `lifespan` or startup event.
- [x] Build the core Inference Service class/functions.
- [x] Implement preprocessing adapter for converting API runtime input into the expected standard schema.
- [x] Implement per-model prediction formatter logic (generating probabilities).
- [x] Implement ensemble prediction formatting logic.
- [x] Implement explanation generation (heuristic or feature-importance based).
- [x] Implement the `POST /api/v1/classify` endpoint using the defined schemas and services.
- [x] Implement request validation error handling in FastAPI.
- [x] Add structured logging for inference requests.
- [x] Implement the `GET /api/v1/models` endpoint for metadata.
- [x] Implement error-safe fallback responses (graceful degradation).
- [x] **Validation Checkpoint:** Call `/api/v1/classify` via `curl` or Postman with test data and verify the exact API contract is respected.

---
## Phase 8 - Interactive Landing Page Foundation
- [x] Read and follow the product/UI spec in `claude_code_spam_landing_page_spec.md` before implementing this phase.
- [x] Build the main Next.js app shell layout in `apps/web/app/layout.tsx`.
- [x] Define and apply the dark premium visual system from the spec using `tailwind.config.ts`, CSS variables, and global styles.
- [x] Set up the landing page route and overall page composition.
- [x] Create a top navigation/header with logo/brand, primary CTA, and optional secondary CTA.
- [x] Build the hero section structure with clear headline, supporting text, and CTA stack.
- [x] Create the central interactive scene container for the spam-toss experience.
- [x] Add the initially empty trash can as the core hero object.
- [x] Create reusable floating spam paper/crumpled paper components.
- [x] Add idle motion for the hero scene so the page feels alive before user interaction.
- [x] Add responsive layout behavior for desktop, tablet, and mobile hero composition.
- [x] Add reduced-motion support and keyboard-accessible interaction fallbacks.
- [x] **Validation Checkpoint:** Verify the landing page shell renders correctly, design tokens apply consistently, the hero scene loads without crashing, and the initial state shows an empty trash can with visible interactive spam items.

---

## Phase 9 - Interactive Hero Experience
- [x] Read and follow the animation/UX behavior defined in `claude_code_spam_landing_page_spec.md`.
- [x] Implement click-to-throw interaction for each spam paper.
- [x] Optionally implement drag-and-release toss behavior for desktop, while keeping tap/click as the primary interaction.
- [x] Animate each paper along a smooth parabolic arc into the trash can.
- [x] Add subtle motion polish such as lift, rotation, squash/stretch, trail, and trash can bounce on impact.
- [x] Show hover/focus affordances on interactive spam items.
- [x] Add temporary classification labels on interaction/impact (e.g. `Phishing`, `Promo Spam`, `Scam`).
- [x] Implement progressive trash fill state as more spam items are tossed.
- [x] Add a lightweight progress indicator such as “1 spam removed”, “2 spam removed”, etc.
- [x] Update the hero copy/CTA state after all items are tossed, ending in a completion state like “Inbox cleared. Try the live demo.”
- [x] Build the post-interaction completion state without forcing the user to finish the animation to access the CTA.
- [x] Ensure the interaction remains performant and visually smooth on common laptop/mobile hardware.
- [x] Build an accessible fallback/static state if animation or WebGL-style effects are unavailable.
- [x] **Validation Checkpoint:** Verify the full hero interaction works end-to-end: papers are interactive, toss animations land correctly in the bin, progress updates render properly, the trash state changes visually, and the final CTA/completion state appears correctly.

---

## Phase 10 - Supporting Landing Sections
- [x] Build the “How It Works” section beneath the hero.
- [x] Add 3 concise steps/cards such as Detect, Classify, Filter.
- [x] Build a product/demo preview section that hints at the actual classifier workflow.
- [x] Add trust/metrics section placeholders for dataset size, model quality, or performance claims.
- [x] Build a final CTA section reinforcing the product goal and guiding the user to the classifier/demo.
- [x] Ensure all sections follow the same premium dark design language from `claude_code_spam_landing_page_spec.md`.
- [x] **Validation Checkpoint:** Verify the landing page flows logically from hero → explanation → credibility → CTA, without feeling like a disconnected animation demo.

---

## Phase 11 - Motion, Polish, and UX Refinement
- [x] Add Framer Motion transitions for content reveal, CTA emphasis, and section entrance.
- [x] Tune animation timing so the experience feels premium and not game-like or overly bouncy.
- [x] Add subtle ambient background motion and depth without distracting from the main interaction.
- [x] Add hover/focus/pressed states for all clickable elements.
- [x] Fine-tune spacing, layering, and contrast for a clean premium visual hierarchy.
- [x] Run mobile UX review and simplify any interactions that feel awkward on touch devices.
- [x] Run accessibility review for focus order, keyboard interaction, aria labeling, and motion reduction.
- [x] **Validation Checkpoint:** Verify the page feels polished, discoverable, responsive, accessible, and aligned with the behavior and tone described in `claude_code_spam_landing_page_spec.md`.
---

## Phase 12 - Anonymous History
- [ ] Design the local storage history item schema (TypeScript interface).
- [ ] Implement local storage persistence logic for results.
- [ ] Build a history sidebar or dedicated `/history` page.
- [ ] Implement a summary preview card for saved history results.
- [ ] Add functionality to click a history item and restore it into the main view.
- [ ] Add functionality to delete individual history items.
- [ ] Add a "Clear all history" button.
- [ ] **Validation Checkpoint:** Run a classification, check the browser's Local Storage to ensure data saved, and test the reload behavior.

---

## Phase 13 - Basic Persistence (Optional for V1)
- [ ] Set up PostgreSQL connection logic in FastAPI using SQLAlchemy.
- [ ] Define SQLAlchemy database models for classification metadata.
- [ ] Configure Alembic for database migrations.
- [ ] Generate the initial migration for the classification metadata table.
- [ ] Add a table to store model version tracking metadata.
- [ ] Integrate database writing into the `/api/v1/classify` endpoint (store non-sensitive data).
- [ ] **Validation Checkpoint:** Check that `POST /api/v1/classify` does not block or heavily slow down response times when writing to the database.

---

## Phase 14 - Tests
- [ ] Add `pytest` for backend schemas.
- [ ] Add `pytest` for `GET /api/v1/health` and `POST /api/v1/classify` API routes.
- [ ] Add an ML smoke test verifying artifact bundle loading in isolation.
- [ ] Add an ML test verifying the inference pipeline outputs the expected shape natively.
- [ ] Add React Testing Library/Jest tests for form validation logic.
- [ ] Add a frontend component test ensuring the `VerdictCard` renders correctly.
- [ ] **Validation Checkpoint:** Run the entire test suite (`pytest` and `npm run test`) and ensure 100% pass rate.

---

## Phase 15 - Deployment
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

## Phase 16 - Gmail-Ready Foundations (Do not fully implement in V1)
- [ ] Add placeholder route file for auth endpoints (`apps/api/app/api/v1/auth.py`).
- [ ] Add placeholder OAuth service class in backend.
- [ ] Define SQLAlchemy database models for future users and OAuth tokens.
- [ ] Add a privacy policy page content in the frontend (`apps/web/app/privacy/page.tsx`).
- [ ] Document token encryption utility plans in comments/docs.
- [ ] Document the intended disconnect/revoke flow for Gmail access.
- [ ] **Validation Checkpoint:** Ensure no active OAuth blocking code breaks V1 anonymous classification.
- [ ] Re-enable the anonymous classification rate limit (3 uses) in `apps/web/components/classify/ClassifyForm.tsx` once auth is live — the `MAX_ANONYMOUS_USES`, `STORAGE_KEY`, `getUsageCount`, and `incrementUsageCount` logic was removed and should be restored and gated behind an "is authenticated" check.

---

## Phase 17 - Polishing
- [ ] Refine loading skeletons for smoother perceived performance.
- [ ] Improve typography, contrast, and spacing across the app.
- [ ] Display the active model version cleanly in the application footer.
- [ ] Add metadata links to the frontend footer.
- [ ] Write a complete and comprehensive root `README.md` with instructions.
- [ ] Add screenshots or a demo GIF to the root `README.md`.
- [ ] Perform a final code cleanup (remove unused imports, redundant comments).
- [ ] Verify the final implementation strictly aligns with `ARCHITECTURE.md`.
- [ ] **Validation Checkpoint:** The project is presentation-ready and meets all requirements specified in the PRD.
