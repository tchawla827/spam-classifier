# API Reference

Base URL: `http://localhost:8000/api/v1` (development)

All authenticated endpoints require a valid `spam_session` cookie issued by the auth flow.

---

## Health

### `GET /health`

Returns API status. Always public. Used as the health check in deployment.

**Response**
```json
{
  "status": "ok",
  "model_loaded": true,
  "version": "0.1.0"
}
```

---

## Classification

### `POST /classify`

Classifies an email by subject and/or body text. Works for both anonymous and authenticated users. When authenticated, applies the personalization layer and persists the result to history.

**Request**
```json
{
  "subject": "You've won a prize!",
  "body": "Click here to claim your $1000 reward. Act now!",
  "mode": "email"
}
```

At least one of `subject` or `body` must be non-empty.

**Response**
```json
{
  "request_id": "uuid",
  "mode": "email",
  "final_prediction": "spam",
  "final_risk_score": 0.9312,
  "risk_band": "high",
  "agreement_ratio": 1.0,
  "models": [
    { "name": "logistic_regression", "prediction": "spam", "confidence": 0.9421 },
    { "name": "linear_svm",          "prediction": "spam", "confidence": 0.9011 },
    { "name": "xgboost",             "prediction": "spam", "confidence": 0.9567 },
    { "name": "lightgbm",            "prediction": "spam", "confidence": 0.9188 }
  ],
  "ensemble": {
    "name": "stacked_ensemble",
    "prediction": "spam",
    "confidence": 0.9312
  },
  "explanations": {
    "top_signals": ["Contains suspicious keywords: prize, winner, free", "Contains 1 URL(s)"],
    "subject_signals": [],
    "body_signals": ["Contains 'click here' call-to-action"]
  },
  "model_version": "v1.0.0",
  "personalized": true,
  "review_state": "spam",
  "personalization_reasons": ["strict_threshold"],
  "timestamp": "2026-03-26T10:00:00Z",
  "history_id": "uuid"
}
```

Fields `personalized`, `review_state`, `personalization_reasons`, and `history_id` are `null` for anonymous requests.

**Risk bands**
| Band | Score range |
|------|------------|
| `low` | < 0.33 |
| `medium` | 0.33 – 0.67 |
| `high` | ≥ 0.67 |

**Error responses**

| Status | Code | Meaning |
|--------|------|---------|
| 400 | — | Validation error (empty input) |
| 429 | `ANON_RATE_LIMIT` | Anonymous rate limit reached |
| 503 | `MODEL_UNAVAILABLE` | ML bundle failed to load at startup |
| 500 | `INFERENCE_ERROR` | Unexpected inference failure |

---

### `GET /models`

Returns metadata about the loaded model bundle.

**Response**
```json
{
  "version": "v1.0.0",
  "trained_at": "2025-01-01T00:00:00Z",
  "models": ["logistic_regression", "linear_svm", "xgboost", "lightgbm"],
  "base_models": ["logistic_regression", "linear_svm", "xgboost", "lightgbm"],
  "ensemble_threshold": 0.5
}
```

---

## Auth

### `GET /auth/google/start`

Generates a Google OAuth URL with a CSRF state token.

**Response**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "opaque_csrf_state"
}
```

Returns `501` if `GOOGLE_CLIENT_ID` is not configured.

---

### `GET /auth/google/callback`

OAuth callback. Called by Google after user consent. Exchanges the code for a Google ID token, creates or updates the user record, issues a session cookie, and redirects to `FRONTEND_URL/auth/callback`.

Query params: `code`, `state`

---

### `POST /auth/logout`

Revokes the active session and clears the cookie.

**Response**
```json
{ "success": true }
```

---

### `GET /me`

Returns the current user's profile. Requires authentication.

**Response**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Alice Smith",
  "avatar_url": "https://lh3.googleusercontent.com/...",
  "gmail_connected": false,
  "preferences": {
    "sensitivity": "balanced",
    "personalization_enabled": true
  }
}
```

---

## History

All history endpoints require authentication.

### `GET /history`

Returns paginated classification history for the authenticated user.

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Opaque pagination cursor |
| `limit` | int | Items per page (default 20) |
| `source` | `manual\|gmail` | Filter by classification source |
| `verdict` | `spam\|not_spam\|review` | Filter by result |
| `q` | string | Search by subject snippet or sender |

**Response**
```json
{
  "items": [
    {
      "id": "uuid",
      "source": "gmail",
      "subject": "Invoice attached",
      "sender": "billing@example.com",
      "final_prediction": "spam",
      "final_risk_score": 0.91,
      "risk_band": "high",
      "personalized": true,
      "saved_at": "2026-03-22T10:00:00Z"
    }
  ],
  "next_cursor": "opaque_cursor"
}
```

---

### `GET /history/{history_id}`

Returns the full detail record for a single history entry.

---

### `DELETE /history/{history_id}`

Deletes a single history entry.

**Response**
```json
{ "success": true }
```

---

### `POST /history/clear`

Clears all history for the authenticated user.

**Response**
```json
{ "success": true, "deleted": 42 }
```

---

## Feedback

All feedback endpoints require authentication.

### `POST /feedback`

Submits or updates feedback on a history entry. One feedback record per (user, classification).

**Request**
```json
{
  "history_id": "uuid",
  "feedback_label": "false_positive",
  "reason": "This is my bank"
}
```

**Allowed labels:** `correct_spam`, `correct_safe`, `false_positive`, `false_negative`, `not_sure`

**Response**
```json
{
  "success": true,
  "feedback_id": "uuid",
  "rule_suggestion": {
    "type": "trust_sender",
    "sender": "no-reply@mybank.com",
    "suggested": true
  }
}
```

`rule_suggestion` is present when the feedback implies a useful rule (e.g., repeated false positives from the same sender).

---

### `DELETE /feedback/{feedback_id}`

Deletes a feedback record.

**Response**
```json
{ "success": true }
```

---

## Preferences

All preferences endpoints require authentication.

### `GET /preferences`

**Response**
```json
{
  "sensitivity": "balanced",
  "personalization_enabled": true,
  "review_band_enabled": true
}
```

---

### `PUT /preferences`

Updates preferences. All fields are optional.

**Request**
```json
{
  "sensitivity": "strict",
  "personalization_enabled": true,
  "review_band_enabled": true
}
```

**Sensitivity options**

| Value | Spam threshold |
|-------|---------------|
| `relaxed` | 0.65 — fewer spam alerts |
| `balanced` | 0.50 — default |
| `strict` | 0.35 — more aggressive detection |

---

### `GET /rules`

Returns sender and domain override rules.

**Response**
```json
{
  "senders": [
    { "id": "uuid", "sender": "newsletter@example.com", "action": "trust" }
  ],
  "domains": [
    { "id": "uuid", "domain": "crypto-bad.com", "action": "block" }
  ]
}
```

---

### `POST /rules/senders`

Adds a sender override rule.

**Request**
```json
{ "sender": "newsletter@example.com", "action": "trust" }
```

**Actions:** `trust` (always mark safe), `block` (always mark spam)

---

### `POST /rules/domains`

Adds a domain override rule.

**Request**
```json
{ "domain": "crypto-bad.com", "action": "block" }
```

---

### `DELETE /rules/{rule_id}`

Deletes a sender or domain rule.

---

## Gmail

All Gmail endpoints require authentication. Gmail features also require `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` to be configured.

### `GET /gmail/status`

Returns the current Gmail connection state.

**Response**
```json
{
  "connected": true,
  "email": "user@gmail.com",
  "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
  "connected_at": "2026-03-20T10:00:00Z"
}
```

---

### `GET /gmail/connect/start`

Starts the Gmail OAuth connect flow. Returns a redirect to Google's consent screen.

---

### `GET /gmail/connect/callback`

Completes the Gmail OAuth flow. Stores encrypted tokens and redirects to the frontend.

---

### `POST /gmail/disconnect`

Revokes Gmail access and removes stored tokens.

**Response**
```json
{ "success": true }
```

---

### `GET /gmail/messages`

Returns recent Gmail messages for inbox browsing.

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Pagination cursor |
| `limit` | int | Messages per page (default 20) |
| `label` | string | Gmail label filter (e.g., `INBOX`) |
| `q` | string | Gmail search query |

**Response**
```json
{
  "items": [
    {
      "gmail_message_id": "18c123abc",
      "thread_id": "18c120def",
      "subject": "Urgent: verify account",
      "from": "alerts@example.com",
      "snippet": "Please verify your account to avoid suspension...",
      "received_at": "2026-03-22T09:55:00Z",
      "has_attachments": false
    }
  ],
  "next_cursor": "opaque_cursor"
}
```

---

### `POST /gmail/classify`

Classifies a single Gmail message. Fetches the message body, runs the ensemble, applies personalization, and saves to history.

**Request**
```json
{ "gmail_message_id": "18c123abc" }
```

**Response**
```json
{
  "history_id": "uuid",
  "source": "gmail",
  "message": {
    "gmail_message_id": "18c123abc",
    "subject": "Urgent: verify account",
    "from": "alerts@example.com"
  },
  "result": {
    "final_prediction": "spam",
    "final_risk_score": 0.94,
    "risk_band": "high",
    "review_state": "spam",
    "personalized": true,
    "personalization_reasons": ["blocked_domain_override"],
    "models": [...],
    "ensemble": {...},
    "explanations": {...}
  }
}
```

---

### `POST /gmail/classify-batch`

Classifies multiple Gmail messages in one request.

**Request**
```json
{ "gmail_message_ids": ["18c123abc", "18c124def"] }
```

**Response**
```json
{
  "results": [
    { "gmail_message_id": "18c123abc", "history_id": "uuid", "result": {...} },
    { "gmail_message_id": "18c124def", "history_id": "uuid", "result": {...} }
  ]
}
```

---

## Insights

Requires authentication.

### `GET /insights/summary`

Returns per-user classification statistics.

**Response**
```json
{
  "total_classifications": 142,
  "spam_detected": 61,
  "safe_detected": 67,
  "review_count": 14,
  "false_positive_count": 6,
  "false_negative_count": 3,
  "top_flagged_domains": [
    { "domain": "bad-example.com", "count": 9 }
  ]
}
```

---

## Account

Requires authentication.

### `DELETE /account`

Permanently deletes the user account and all associated data (history, feedback, preferences, rules, Gmail tokens, sessions).

**Response**
```json
{ "success": true }
```

---

## Error format

All error responses follow this shape:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable message.",
    "details": {}
  }
}
```
