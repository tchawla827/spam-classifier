# Database

SpamShield uses PostgreSQL with async SQLAlchemy. The database is **optional** — the app boots and manual classification works without it. Persistence-backed features (history, auth, feedback, preferences, rules, Gmail) require a valid `DATABASE_URL`.

Migrations are managed with Alembic. All schema changes go through migration files in `apps/api/alembic/versions/`.

---

## Running migrations

```bash
cd apps/api
alembic upgrade head        # apply all pending migrations
alembic downgrade -1        # roll back one migration
alembic revision --autogenerate -m "description"  # generate a new migration
```

---

## Schema

### `classification_log`

Logs non-sensitive metadata for every classification request (anonymous and authenticated). Preserved from V1 — do not modify.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `request_id` | UUID unique | Matches `ClassifyResponse.request_id` |
| `timestamp` | timestamptz | Request time |
| `mode` | varchar(32) | Always `"email"` currently |
| `final_prediction` | varchar(16) | `"spam"` or `"not_spam"` |
| `final_risk_score` | float | Ensemble probability [0, 1] |
| `risk_band` | varchar(16) | `"low"`, `"medium"`, or `"high"` |
| `agreement_ratio` | float | Fraction of base models agreeing |
| `model_version` | varchar(64) | Bundle version string |
| `subject_length` | int | Character count |
| `body_length` | int | Character count |
| `inference_latency_ms` | float | Wall time for inference |

---

### `model_version_log`

Tracks when each model version was first and last seen.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `model_version` | varchar(64) unique | |
| `first_seen_at` | timestamptz | |
| `last_seen_at` | timestamptz | |

---

### `users`

Authenticated user accounts created on first Google sign-in.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `email` | varchar(320) unique | |
| `name` | varchar(256) nullable | Display name from Google |
| `avatar_url` | varchar(2048) nullable | Google profile photo URL |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `user_sessions`

HTTP-only session tokens. One user can have multiple concurrent sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `token_hash` | varchar(128) unique | SHA-256 hash of the raw cookie value |
| `created_at` | timestamptz | |
| `expires_at` | timestamptz | Sessions expire after `SESSION_EXPIRY_HOURS` (default 168h = 7 days) |
| `is_revoked` | bool | Set to true on logout |

---

### `oauth_accounts`

Links a user to their Google OAuth provider account ID. Allows linking the same user on future sign-ins.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `provider` | varchar(32) | Always `"google"` currently |
| `provider_account_id` | varchar(256) | Google account ID |

Unique constraint: `(provider, provider_account_id)`.

---

### `gmail_connections`

Stores encrypted OAuth tokens for a user's connected Gmail account. One per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users unique | |
| `gmail_email` | varchar(320) | The connected Gmail address |
| `access_token_enc` | text nullable | Encrypted access token |
| `refresh_token_enc` | text nullable | Encrypted refresh token |
| `token_expires_at` | timestamptz | Access token expiry |
| `scopes` | varchar(1024) | Space-separated granted scopes |
| `connected_at` | timestamptz | |
| `disconnected_at` | timestamptz nullable | Set when user disconnects; null means currently connected |

---

### `classification_events`

Per-user history record for every classification (manual or Gmail-sourced).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users nullable | Null if the event was later anonymised |
| `request_id` | UUID unique | Matches `classification_log.request_id` |
| `source` | varchar(16) | `"manual"` or `"gmail"` |
| `gmail_message_id` | varchar(256) nullable | Only set for Gmail-sourced events |
| `subject_snippet` | varchar(256) nullable | Truncated subject for display |
| `sender` | varchar(320) nullable | Sender address |
| `final_prediction` | varchar(16) | `"spam"` or `"not_spam"` |
| `final_risk_score` | float | Post-personalization score |
| `risk_band` | varchar(16) | `"low"`, `"medium"`, `"high"` |
| `review_state` | varchar(16) nullable | `"spam"`, `"not_spam"`, or `"review"` |
| `personalized` | bool | Whether personalization changed the result |
| `personalization_reasons` | text nullable | JSON array of reason strings |
| `agreement_ratio` | float | |
| `model_version` | varchar(64) | |
| `inference_latency_ms` | float | |
| `created_at` | timestamptz | |

Indexes: `user_id`, `created_at`, `source`.

---

### `feedback_events`

User correction on a specific classification.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `classification_event_id` | UUID FK → classification_events | |
| `feedback_label` | varchar(32) | `"correct_spam"`, `"correct_safe"`, `"false_positive"`, `"false_negative"`, `"not_sure"` |
| `reason` | varchar(256) nullable | Free-text reason |
| `created_at` | timestamptz | |

Unique constraint: `(user_id, classification_event_id)` — one feedback record per user per event.

---

### `sender_overrides`

Per-user trust or block rule for a specific sender address.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `sender` | varchar(320) | Full email address |
| `action` | varchar(16) | `"trust"` or `"block"` |
| `created_at` | timestamptz | |

Unique constraint: `(user_id, sender)`.

---

### `domain_overrides`

Per-user trust or block rule for an entire domain.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `domain` | varchar(256) | Domain name (e.g., `example.com`) |
| `action` | varchar(16) | `"trust"` or `"block"` |
| `created_at` | timestamptz | |

Unique constraint: `(user_id, domain)`.

---

### `user_preferences`

Per-user personalization and sensitivity settings. One row per user, auto-created with defaults on first read.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users unique | |
| `sensitivity` | varchar(16) | `"relaxed"`, `"balanced"` (default), or `"strict"` |
| `personalization_enabled` | bool | Whether the personalization layer is active (default true) |
| `review_band_enabled` | bool | Whether the "review" state is surfaced (default true) |
| `updated_at` | timestamptz | |

---

### `personalization_profiles`

Aggregated feedback statistics that drive the score adjustment in the personalization layer.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users unique | |
| `total_classifications` | int | Running count |
| `total_feedback` | int | Running count |
| `false_positive_count` | int | Feedback labels `"false_positive"` |
| `false_negative_count` | int | Feedback labels `"false_negative"` |
| `score_adjustment` | float | Computed adjustment applied to global score; clamped to ±0.15 |
| `updated_at` | timestamptz | |

---

## Entity relationships

```
users
 ├── user_sessions (1:N)
 ├── oauth_accounts (1:N)
 ├── gmail_connections (1:1)
 ├── classification_events (1:N)
 │    └── feedback_events (1:N)
 ├── sender_overrides (1:N)
 ├── domain_overrides (1:N)
 ├── user_preferences (1:1)
 └── personalization_profiles (1:1)
```

Deleting a user cascades to all owned rows. `classification_events.user_id` is set to NULL on user deletion (events are kept for the global `classification_log`).
