# ARCHITECTURE_V2.md

## High-level principle

V2 must be an **extension** of the current V1 system, not a replacement.

The current global classifier remains the core decision engine.
V2 adds identity, Gmail ingestion, persistence, and personalization around it.

---

## Current stable core

### Existing frontend
- landing page
- hero interaction
- manual classifier form
- local result rendering
- anonymous local history

### Existing backend
- health/models/classify endpoints
- ML artifact loading
- classify service path
- optional DB logging

### Existing ML
- feature pipeline
- calibrated base models
- stacker ensemble
- heuristic explanations

This core should stay intact.

---

## V2 architecture layers

## 1. Identity layer
Responsibilities:
- Google sign-in
- session issuance/validation
- current user retrieval
- sign out
- route protection for authenticated features

Suggested modules:
- `app/api/v1/auth.py`
- `app/services/auth_service.py`
- `app/services/session_service.py`
- frontend auth context/hooks

---

## 2. User data layer
Responsibilities:
- users
- sessions
- user settings
- Gmail connection metadata
- user history
- feedback
- personalization rules

Suggested tables:
- `users`
- `user_sessions`
- `oauth_accounts`
- `gmail_connections`
- `classification_events`
- `feedback_events`
- `sender_overrides`
- `domain_overrides`
- `user_preferences`
- `personalization_profiles`

---

## 3. Gmail integration layer
Responsibilities:
- OAuth start/callback/disconnect
- token refresh
- fetch recent message metadata
- fetch selected message bodies when needed
- normalize Gmail messages into the same classify input shape

Suggested modules:
- `app/api/v1/gmail.py`
- `app/services/gmail_oauth_service.py`
- `app/services/gmail_client.py`
- `app/services/gmail_message_mapper.py`

Important rule:
Gmail is only an **input source** into the existing classify pipeline.

---

## 4. Classification orchestration layer
Responsibilities:
- reuse current manual classify path
- support Gmail message classification
- write user-scoped classification records
- route all decision logic through a consistent service

Suggested modules:
- `app/services/classification_service.py`
- `app/services/history_service.py`

This layer should wrap the existing global inference rather than duplicating logic.

---

## 5. Personalization layer
Responsibilities:
- apply user threshold profile
- apply sender/domain overrides
- apply feedback-based score correction
- determine review band
- explain why final outcome changed

Suggested modules:
- `app/services/personalization_service.py`
- `app/services/rules_service.py`
- `app/services/feedback_service.py`

### Personalization order
1. run current global ensemble
2. load user settings + rules
3. apply hard overrides
4. apply soft score adjustment from feedback profile
5. apply user-specific threshold
6. assign final label and explanation metadata

This preserves the existing ML core while making outcomes user-aware.

---

## 6. Frontend experience layer
Responsibilities:
- preserve current landing page
- show auth state
- show user history sidebar
- show Gmail inbox list
- show per-email feedback controls
- show settings/preferences
- show dashboard

Suggested route additions:
- `/app` or `/dashboard`
- `/history`
- `/gmail`
- `/settings`
- `/insights`

Alternative:
Keep `/` as marketing + demo, add signed-in workspace routes separately.

---

## 7. Privacy and data control layer
Responsibilities:
- restrict data retention
- allow disconnect/reset/delete flows
- avoid storing full bodies by default
- separate ephemeral Gmail fetches from durable user records

---

## Core flows

## Flow A: Anonymous manual classify (must remain)
1. user visits `/`
2. enters subject/body
3. frontend calls existing `/api/v1/classify`
4. backend returns global result
5. frontend stores local history

## Flow B: Authenticated manual classify
1. user signs in
2. enters subject/body
3. frontend calls authenticated classify route or same route with session context
4. backend runs global inference
5. backend writes user-scoped history
6. personalization may apply if enabled
7. frontend shows server-backed result and history updates

## Flow C: Gmail classify
1. user connects Gmail
2. frontend loads recent messages
3. user selects message(s)
4. backend fetches Gmail message content
5. backend maps message to subject/body shape
6. backend runs global inference
7. personalization layer adjusts outcome
8. backend stores user-scoped result
9. frontend displays result + feedback controls

## Flow D: Feedback loop
1. user marks result as wrong/right
2. backend stores feedback event
3. rules engine may offer suggestion
4. personalization profile is updated
5. future results incorporate this signal

---

## Personalization design

## Hard personalization
These override the model:
- trust sender
- trust domain
- block sender
- block domain

## Soft personalization
These adjust score, not instantly override:
- strict/balanced/relaxed thresholds
- learned correction from repeated feedback
- category preference nudges later

## Review band
Introduce a third product state:
- safe
- spam
- review

Use review when:
- confidence is mid-range
- model and rules disagree
- personalization meaningfully changed the score
- feedback history is sparse

---

## Data storage strategy

### Store durably
- user account info
- classification metadata
- verdicts and scores
- sender/domain metadata
- feedback events
- override rules
- user preferences
- aggregate personalization profile

### Store carefully / optionally / ephemerally
- raw Gmail bodies
- raw Gmail headers beyond what is needed
- long-lived raw content archives

Recommended default:
- store only what is needed for history display and personalization
- provide retention controls

---

## Backward-compatibility rules

- `POST /api/v1/classify` must continue to work for manual classification.
- current model metadata loading must remain intact.
- the current frontend homepage must not depend on auth.
- anonymous usage must not be blocked by missing Gmail credentials.
- current DB classification logging should either remain supported or be gracefully migrated into user-scoped events.

---

## Recommended deployment stance

### Frontend
- Vercel stays fine

### Backend
- Render or equivalent remains fine

### DB
- Postgres remains system of record

### OAuth secrets
- environment variables only
- never commit secrets

### Gmail scopes
Prefer the minimum set required for:
- read recent messages
- metadata access
- content fetch for selected classification
Add write scopes only later if Gmail write-back is explicitly implemented.
