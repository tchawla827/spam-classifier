# Test Plan

## 1. Goal
Verify that the system is reliable at the contract level, not just visually functional.

Focus on:
- schema correctness
- inference output correctness
- API behavior
- core frontend interaction
- artifact loading stability

---

## 2. Backend Tests

## 2.1 Health Endpoint
### Case
Request:
- `GET /api/v1/health`

Expected:
- status code `200`
- JSON contains `{ "status": "ok" }`

---

## 2.2 Classify Endpoint - Happy Path
### Case
Request:
```json
{
  "subject": "Win a free prize now",
  "body": "Click here to claim your reward.",
  "mode": "email"
}
```

Expected:
- status code `200`
- response contains:
  - `request_id`
  - `final_prediction`
  - `final_risk_score`
  - `risk_band`
  - `agreement_ratio`
  - `models` array
  - `ensemble`
  - `model_version`
  - `timestamp`

Validation:
- `models.length >= 1`
- each model has:
  - `name`
  - `prediction`
  - `confidence`

---

## 2.3 Classify Endpoint - Invalid Empty Input
### Case
Request:
```json
{
  "subject": "",
  "body": "",
  "mode": "email"
}
```

Expected:
- validation error status
- clear error message
- no internal traceback leaked

---

## 2.4 Classify Endpoint - Missing Body but Valid Subject
Decide according to implementation rule.
If subject-only inference is allowed:
- request should still succeed

If body is mandatory:
- request should fail with clear message

This must match the documented schema.

---

## 2.5 Models Endpoint
### Case
Request:
- `GET /api/v1/models`

Expected:
- status code `200`
- JSON contains version and list of loaded models

---

## 3. ML Tests

## 3.1 Artifact Load Smoke Test
### Case
Load exported production artifact bundle

Expected:
- no exception
- all expected components available:
  - preprocessors
  - base models
  - calibrators or calibrated estimators
  - stacker
  - metadata

---

## 3.2 Single Inference Output Shape
### Case
Run runtime prediction on one synthetic example

Expected:
- structured dictionary returned
- includes base model outputs
- includes ensemble output
- includes explanation signals

---

## 3.3 Confidence Range Test
Expected:
- every confidence score is numeric
- all confidence values are between `0.0` and `1.0`

---

## 3.4 Risk Band Mapping Test
Given fixed risk score inputs:
- `0.10`
- `0.45`
- `0.80`

Expected:
- each maps consistently to configured band logic

---

## 3.5 Leakage Guard Smoke Test
Expected:
- split utility should not place duplicate IDs across train/test if IDs exist
- dedupe utility should remove exact duplicates

---

## 4. Frontend Tests

## 4.1 Form Validation
### Case
User clicks classify with empty subject and empty body

Expected:
- client-side validation message shown
- API call not triggered

---

## 4.2 Loading State
### Case
User submits valid input

Expected:
- button enters loading state
- duplicate submission is prevented while pending

---

## 4.3 Result Rendering
### Case
Mock a valid API response

Expected:
- final verdict card renders
- model comparison cards render
- explanation panel renders
- risk score appears

---

## 4.4 Error Rendering
### Case
Mock API failure

Expected:
- visible non-crashing error message
- user can retry

---

## 4.5 History Persistence
### Case
Save successful classification

Expected:
- result saved to local storage
- history view displays saved item
- reopen action restores details

---

## 5. Manual Smoke Tests

## 5.1 Likely Spam Example
Input:
- urgent subject
- suspicious body with reward/click language

Expected:
- system likely returns `spam`
- explanation references urgent/click/reward-like patterns

---

## 5.2 Likely Non-Spam Example
Input:
- routine work/team email

Expected:
- system likely returns `not_spam`
- no broken UI state

---

## 5.3 Long Body Input
Input:
- large pasted body within allowed input size

Expected:
- request handled gracefully
- no frontend freeze
- no server crash

---

## 6. Minimum Required Automated Coverage
Before calling MVP stable:
- health endpoint tested
- classify endpoint happy path tested
- classify endpoint invalid input tested
- artifact loading smoke test present
- frontend form validation tested
- frontend result render tested
