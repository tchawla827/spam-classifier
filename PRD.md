# Product Requirements Document

## 1. Project Title
Email Spam Classifier with Ensemble ML, Confidence Breakdown, and Gmail-Ready Architecture

## 2. Goal
Build a production-style web application that classifies email text as `spam` or `not spam` using an ensemble of machine learning models.

The application must:
- accept email `subject` and `body`
- run multiple trained models
- show each model's prediction and calibrated confidence
- show a final ensemble prediction and risk score
- provide lightweight explanation signals
- support anonymous use in V1
- be architected for future Gmail OAuth integration with privacy-first design

This project will be built using Claude Code inside Antigravity, so the implementation must be modular, iterative, and easy to execute in small steps.

---

## 3. Primary Objective
Deliver a polished, deployable MVP with:
- dark premium cybersecurity-themed UI
- FastAPI backend
- classical ML ensemble pipeline
- structured inference API
- local/session history
- scalable monorepo setup

---

## 4. Non-Goals (for V1)
Do NOT build these in the initial MVP:
- full Gmail inbox sync
- writing back to Gmail labels/categories
- browser extension
- transformer model serving
- attachment scanning
- HTML email rendering
- admin auth dashboard
- background retraining service

These can be added later.

---

## 5. Target Users
### Primary
- recruiters / reviewers evaluating the project
- developers exploring a production-style ML system
- end users wanting to paste an email and assess spam risk

### Secondary
- future signed-in users connecting Gmail for limited classification workflows

---

## 6. User Problems Solved
Users need a tool that:
- quickly estimates whether an email is spam/phishing-like
- explains the result beyond a single label
- compares multiple model opinions
- presents a trustworthy final decision
- feels like a real product, not a notebook demo

---

## 7. Core Features (V1)
### 7.1 Email Classification
- input fields for `subject` and `body`
- one-click classify action
- spam / not-spam result

### 7.2 Multi-Model Output
Show predictions from:
- Logistic Regression
- Linear SVM
- XGBoost
- LightGBM

### 7.3 Ensemble Output
- final prediction from stacking meta-model
- final calibrated risk score
- agreement ratio across models

### 7.4 Confidence Breakdown
- per-model confidence
- final ensemble confidence
- confidence shown as calibrated risk/confidence, not raw arbitrary score

### 7.5 Explanation Layer
Display lightweight reasoning such as:
- urgency language detected
- suspicious CTA patterns
- high URL density
- account/invoice/bank language

### 7.6 History
- anonymous local history in browser
- optional backend session history if easy to implement

### 7.7 Health / Model Info
- API health endpoint
- API model version endpoint

---

## 8. Future Features (Post-V1)
### V1.5
- feedback capture: correct / incorrect / unsure
- more robust explanation views
- threshold presets

### V2
- user login
- Gmail OAuth connect
- classify selected Gmail messages
- encrypted token storage
- privacy settings and revoke flow

---

## 9. User Flow (V1)
### Main Flow
1. User opens web app
2. User enters email subject
3. User pastes email body
4. User clicks `Classify`
5. Frontend sends request to API
6. Backend runs preprocessing and ensemble inference
7. API returns:
   - final prediction
   - final risk score
   - per-model predictions/confidence
   - explanations
8. UI renders results
9. User optionally saves result in local history
10. User optionally marks result feedback (later phase)

### Secondary Flow
1. User opens history
2. User views previous local results
3. User reopens result details

---

## 10. Functional Requirements
### Input
- subject is optional but encouraged
- body is required
- sanitize and trim inputs
- reject empty overall content

### Classification
- use pre-trained exported model artifacts
- return response in under reasonable inference time
- support deterministic structured JSON response

### Output
The response must include:
- request ID
- final prediction
- final risk score
- risk band
- agreement ratio
- per-model outputs
- explanation signals
- model version
- timestamp

### History
- store history locally in browser in V1
- keep data model ready for backend persistence later

---

## 11. Quality Requirements
### Performance
- API should respond quickly for normal pasted emails
- avoid overly heavy runtime dependencies in V1

### Reliability
- malformed requests should return clear validation errors
- model loading should fail loudly at startup, not silently during inference

### Maintainability
- strict module boundaries
- reusable schemas
- separate frontend/backend/ml concerns

### Scalability
- monorepo with clear package ownership
- future Gmail integration should not require major rewrites

### UX
- polished dark premium design
- clear loading, success, and error states
- visually distinct risk levels

---

## 12. Constraints
- optimize for free/low-cost deployment
- use classical ML first, not transformer inference
- anonymous first, login later
- Gmail integration must be planned but not block V1
- must be executable by Claude Code in small modular steps
- project should be portfolio-grade and production-style

---

## 13. Success Criteria
The MVP is successful if:
- app runs locally end-to-end
- user can classify subject + body
- results show all model outputs and ensemble result
- UI is polished and usable
- backend exposes stable endpoints
- codebase is clean and modular
- deployment on free services is feasible
- architecture clearly supports Gmail integration later

---

## 14. Final Output
A complete monorepo containing:
- Next.js frontend
- FastAPI backend
- ML training/inference pipeline
- exported model artifacts
- clean docs
- tests for core logic
- deployable MVP with dark premium UI
