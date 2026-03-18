# API Contracts

## 1. Purpose
Define stable request/response formats early so frontend and backend can progress independently.

---

## 2. Classification Request

```json
{
  "subject": "string",
  "body": "string",
  "mode": "email"
}
```

Rules:
- `mode` is fixed to `email` in V1
- `subject` may be empty
- `body` may be required depending on schema choice, but total content must not be empty

---

## 3. Classification Response

```json
{
  "request_id": "uuid",
  "mode": "email",
  "final_prediction": "spam",
  "final_risk_score": 0.94,
  "risk_band": "high",
  "agreement_ratio": 1.0,
  "models": [
    {
      "name": "logistic_regression",
      "prediction": "spam",
      "confidence": 0.91
    },
    {
      "name": "linear_svm",
      "prediction": "spam",
      "confidence": 0.89
    },
    {
      "name": "xgboost",
      "prediction": "spam",
      "confidence": 0.95
    },
    {
      "name": "lightgbm",
      "prediction": "spam",
      "confidence": 0.93
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
    ],
    "subject_signals": [
      "urgent",
      "verify your account"
    ],
    "body_signals": [
      "suspended",
      "login immediately"
    ]
  },
  "model_version": "email-spam-v1.0.0",
  "timestamp": "2026-03-18T08:00:00Z"
}
```

---

## 4. Field Definitions

### `request_id`
Unique per request for tracing.

### `final_prediction`
Allowed:
- `spam`
- `not_spam`

### `final_risk_score`
Float from `0.0` to `1.0`

### `risk_band`
Suggested:
- `low`
- `medium`
- `high`

### `agreement_ratio`
Float from `0.0` to `1.0`

### `models`
Array of base-model outputs only.

### `ensemble`
Final meta-model output.

### `explanations`
Human-readable lightweight explanation payload.

---

## 5. Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input must contain subject or body text.",
    "details": {}
  }
}
```

Rules:
- always return structured error body
- never leak internal stack traces

---

## 6. Health Response

```json
{
  "status": "ok"
}
```

---

## 7. Models Response

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

## 8. Versioning Rules
- keep routes under `/api/v1`
- additive fields are allowed
- do not remove or rename fields casually once frontend depends on them
