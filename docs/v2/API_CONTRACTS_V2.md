# API_CONTRACTS_V2.md

This document defines the V2 API additions while preserving the current V1 contracts.

## Existing routes to preserve

### `GET /api/v1/health`
Must remain.

### `POST /api/v1/classify`
Must remain.
Can be extended internally to use session context when available, but request/response compatibility should be preserved.

### `GET /api/v1/models`
Must remain.

---

## New route groups

## 1. Auth

### `GET /api/v1/auth/google/start`
Starts Google sign-in.

Response:
```json
{
  "auth_url": "https://accounts.google.com/...",
  "state": "opaque_csrf_state"
}
```

### `GET /api/v1/auth/google/callback`
Completes Google sign-in and creates session.

Response:
- redirect to frontend callback route, or
- JSON in local-only mode

### `POST /api/v1/auth/logout`
Destroys active session.

Response:
```json
{
  "success": true
}
```

### `GET /api/v1/me`
Returns current authenticated user.

Response:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "avatar_url": "https://...",
  "gmail_connected": true,
  "preferences": {
    "sensitivity": "balanced",
    "personalization_enabled": true
  }
}
```

---

## 2. History

### `GET /api/v1/history`
Returns account-scoped history.

Query params:
- `cursor`
- `limit`
- `source` = `manual | gmail`
- `verdict` = `spam | not_spam | review`
- `q`

Response:
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

### `GET /api/v1/history/{history_id}`
Returns full history record.

### `DELETE /api/v1/history/{history_id}`
Deletes one history record.

### `POST /api/v1/history/clear`
Clears account history subject to product rules.

---

## 3. Gmail

### `GET /api/v1/gmail/status`
Returns Gmail connection state.

Response:
```json
{
  "connected": true,
  "email": "user@gmail.com",
  "scopes": ["gmail.readonly"],
  "connected_at": "2026-03-22T10:00:00Z"
}
```

### `GET /api/v1/gmail/connect/start`
Starts Gmail OAuth connect flow.

### `GET /api/v1/gmail/connect/callback`
Completes Gmail OAuth connect flow.

### `POST /api/v1/gmail/disconnect`
Disconnects Gmail and revokes tokens if possible.

### `GET /api/v1/gmail/messages`
Returns recent messages for inbox browsing.

Query params:
- `cursor`
- `limit`
- `label`
- `q`

Response:
```json
{
  "items": [
    {
      "gmail_message_id": "18c123...",
      "thread_id": "18c120...",
      "subject": "Urgent: verify account",
      "from": "alerts@example.com",
      "snippet": "Please verify your account...",
      "received_at": "2026-03-22T09:55:00Z",
      "has_attachments": false
    }
  ],
  "next_cursor": "opaque_cursor"
}
```

### `POST /api/v1/gmail/classify`
Classifies one Gmail message.

Request:
```json
{
  "gmail_message_id": "18c123..."
}
```

Response:
```json
{
  "history_id": "uuid",
  "source": "gmail",
  "message": {
    "gmail_message_id": "18c123...",
    "subject": "Urgent: verify account",
    "from": "alerts@example.com"
  },
  "result": {
    "final_prediction": "spam",
    "final_risk_score": 0.94,
    "risk_band": "high",
    "review_state": "spam",
    "personalized": true,
    "personalization_reasons": [
      "blocked_domain_override"
    ],
    "models": [],
    "ensemble": {},
    "explanations": {
      "top_signals": [],
      "subject_signals": [],
      "body_signals": [],
      "personalization_signals": [
        "Blocked domain rule applied"
      ]
    }
  }
}
```

### `POST /api/v1/gmail/classify-batch`
Classifies multiple Gmail messages.

Request:
```json
{
  "gmail_message_ids": ["18c123...", "18c124..."]
}
```

---

## 4. Feedback

### `POST /api/v1/feedback`
Creates or updates user feedback for a classification.

Request:
```json
{
  "history_id": "uuid",
  "feedback_label": "false_positive",
  "reason": "trusted_sender"
}
```

Allowed labels:
- `correct_spam`
- `correct_safe`
- `false_positive`
- `false_negative`
- `not_sure`

Response:
```json
{
  "success": true,
  "feedback_id": "uuid",
  "rule_suggestion": {
    "type": "trust_sender",
    "sender": "newsletter@example.com",
    "suggested": true
  }
}
```

### `DELETE /api/v1/feedback/{feedback_id}`
Deletes feedback.

---

## 5. User rules and settings

### `GET /api/v1/preferences`
Returns user settings.

Response:
```json
{
  "sensitivity": "balanced",
  "personalization_enabled": true,
  "review_band_enabled": true
}
```

### `PUT /api/v1/preferences`
Updates user settings.

Request:
```json
{
  "sensitivity": "strict",
  "personalization_enabled": true,
  "review_band_enabled": true
}
```

### `GET /api/v1/rules`
Returns sender/domain overrides.

Response:
```json
{
  "senders": [
    {
      "id": "uuid",
      "sender": "newsletter@example.com",
      "action": "trust"
    }
  ],
  "domains": [
    {
      "id": "uuid",
      "domain": "crypto-bad.com",
      "action": "block"
    }
  ]
}
```

### `POST /api/v1/rules/senders`
Request:
```json
{
  "sender": "newsletter@example.com",
  "action": "trust"
}
```

### `POST /api/v1/rules/domains`
Request:
```json
{
  "domain": "crypto-bad.com",
  "action": "block"
}
```

### `DELETE /api/v1/rules/{rule_id}`
Deletes a rule.

---

## 6. Insights

### `GET /api/v1/insights/summary`
Returns basic user dashboard stats.

Response:
```json
{
  "total_classifications": 142,
  "spam_detected": 61,
  "safe_detected": 67,
  "review_count": 14,
  "false_positive_count": 6,
  "false_negative_count": 3,
  "top_flagged_domains": [
    {
      "domain": "bad-example.com",
      "count": 9
    }
  ]
}
```

---

## New response fields for personalized decisions

When personalization is applied, the response shape for authenticated classify flows should support:

```json
{
  "personalized": true,
  "review_state": "spam",
  "personalization_reasons": [
    "trust_sender_override",
    "strict_threshold",
    "feedback_score_adjustment"
  ]
}
```

This may be additive to the current V1 classify response in authenticated/internal routes.

---

## Contract rules

- Keep V1 `ClassifyResponse` compatible for the existing manual classify UI.
- Add personalization metadata in a backward-compatible way.
- For new authenticated routes, use explicit versioned schemas.
- Avoid silent shape drift between frontend and backend.
