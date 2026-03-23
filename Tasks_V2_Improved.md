# Tasks_V2_Improved.md

Production-grade, AI-executable blueprint for SpamShield V2.

---

## 0. Executive Summary

### What V2 introduces over V1

| Capability | V1 | V2 |
|---|---|---|
| Identity | Anonymous only | Google sign-in, sessions, user profiles |
| History | localStorage (client-only, 50 items) | Server-backed per-user history with pagination, filtering, search |
| Email source | Manual paste only | Manual paste + Gmail inbox integration |
| Feedback | None | Per-classification feedback (correct/incorrect/not sure) |
| Rules | None | Trust/block sender and domain overrides |
| Personalization | None | Sensitivity thresholds + rule overrides + feedback-learned score adjustment |
| Privacy controls | None | Disconnect Gmail, clear history, reset personalization, delete account |
| Dashboard | None | User stats, false positive/negative summaries, top flagged domains |

### Core architectural evolution

V1 is a **stateless classifier demo**. V2 wraps it with five new layers:

1. **Identity layer** -- Google OAuth, sessions, user profiles
2. **Inbox data source** -- Gmail API integration (read-only)
3. **Per-user persistence** -- Classification events, feedback, rules, preferences
4. **Feedback capture** -- User correction loop feeding personalization
5. **Personalization logic** -- Post-ensemble adjustment layer (threshold + rules + feedback bias)

The existing global ensemble classifier remains the untouched center. Personalization is a **post-model adjustment**, not a retraining pipeline.

### Key risks and complexity areas

| Risk | Severity | Mitigation |
|---|---|---|
| Breaking V1 while adding auth | High | Optional user dependency on classify; V1 regression tests every phase |
| Gmail API complexity (OAuth, token refresh, rate limits) | High | Dedicated service modules; encrypted token storage; graceful degradation |
| User data isolation failures | High | All queries scoped by user_id; dedicated isolation tests |
| Overcoupling personalization to core inference | Medium | Personalization is a separate service called after predict() |
| Type drift between frontend/backend | Medium | Shared types package; contract consolidation phase |
| Storing too much sensitive data | Medium | Privacy-safe defaults; metadata-only; no raw bodies |

---

## 1. Derived System Architecture

### High-level architecture

```
+-----------------------------------------------------+
|                    FRONTEND (Next.js)                |
|                                                      |
|  /  (landing page - V1 preserved)                    |
|  /app/history  /app/gmail  /app/settings  /app/insights |
|                                                      |
|  AuthContext -> useAuth hook                          |
|  middleware.ts (protects /app/* only)                 |
+-----+-----------------------------------------------+
      |  HTTP (cookies for auth, JSON payloads)
      v
+-----+-----------------------------------------------+
|                  BACKEND (FastAPI)                    |
|                                                      |
|  V1 Routes (preserved):                              |
|    GET  /api/v1/health                               |
|    POST /api/v1/classify  (+optional user dep)       |
|    GET  /api/v1/models                               |
|                                                      |
|  V2 Routes (new):                                    |
|    /api/v1/auth/*    /api/v1/me                      |
|    /api/v1/history/* /api/v1/feedback/*               |
|    /api/v1/gmail/*   /api/v1/preferences/*            |
|    /api/v1/rules/*   /api/v1/insights/*               |
|    /api/v1/account/* (delete)                        |
|                                                      |
|  Services Layer:                                     |
|    auth_service, session_service                     |
|    classification_service (wraps predict())           |
|    history_service, feedback_service                  |
|    gmail_oauth_service, gmail_client, gmail_mapper    |
|    rules_service, preferences_service                 |
|    personalization_service, insights_service           |
|    privacy_service                                   |
+-----+-----------------------------------------------+
      |
      v
+-----+-----------------------------------------------+
|              ML INFERENCE (unchanged)                |
|                                                      |
|  predict(subject, body, artifacts) -> dict            |
|  5 base models + stacker ensemble                    |
|  Feature pipeline (TF-IDF + handcrafted)             |
|  Loaded once at startup into app.state.artifacts     |
+-----------------------------------------------------+
      |
      v
+-----+-----------------------------------------------+
|                  POSTGRES (optional for V1)           |
|                                                      |
|  V1 tables (preserved):                              |
|    classification_log, model_version_log             |
|                                                      |
|  V2 tables (new):                                    |
|    users, user_sessions, oauth_accounts              |
|    gmail_connections                                 |
|    classification_events (user-scoped history)       |
|    feedback_events                                   |
|    sender_overrides, domain_overrides                |
|    user_preferences, personalization_profiles        |
+-----------------------------------------------------+
```

### Data flow: Authenticated classification

```
User submits email (manual or Gmail)
  |
  v
POST /api/v1/classify (with session cookie)
  |
  +-> get_optional_user() extracts user from cookie
  |
  +-> predict(subject, body, artifacts) -> global_result
  |
  +-> IF user AND personalization_enabled:
  |     personalization_service.personalize(user_id, global_result, sender, domain)
  |       |-> check sender_overrides (trust/block)
  |       |-> check domain_overrides (trust/block)
  |       |-> load personalization_profile (score_adjustment)
  |       |-> apply sensitivity threshold (relaxed/balanced/strict)
  |       |-> determine review_state
  |       |-> return PersonalizationResult
  |
  +-> Write ClassificationEvent to DB (background task)
  |
  +-> Return ClassifyResponse (+ optional personalization fields)
```

### Trust boundaries

```
[Browser] --cookie--> [FastAPI] --service--> [Postgres]
                          |
                          +--httpx--> [Google OAuth API]
                          +--httpx--> [Gmail API]
                          +--in-process--> [ML predict()]

Trust boundaries:
1. Browser <-> FastAPI: session cookie validation, CSRF state for OAuth
2. FastAPI <-> Google: OAuth code exchange, state verification
3. FastAPI <-> Gmail: access_token (encrypted at rest), minimal scopes
4. FastAPI <-> Postgres: user_id scoping on ALL queries
5. ML predict(): stateless, no user data input, no side effects
```

---

## 2. Execution Plan

### Dependency graph

```
Phase 0: Foundation (config, regression tests)
    |
Phase 1: DB Schema (all V2 tables via single Alembic migration)
    |
Phase 2: Auth Backend (users, sessions, Google OAuth)
    |
    +---> Phase 3: Auth Frontend (context, sign-in UI, middleware)
    |         |
    |         +---> Phase 7: Frontend Workspace Shell (/app routes)
    |
    +---> Phase 4: History Backend (classification_events, history service)
    |         |
    |         +---> Phase 8: History Frontend (sidebar, /app/history)
    |
    +---> Phase 5: Feedback + Rules + Preferences Backend
    |         |
    |         +---> Phase 9: Settings + Feedback Frontend (/app/settings)
    |
    +---> Phase 6: Gmail Backend (OAuth, client, classify)
              |
              +---> Phase 10: Gmail Frontend (/app/gmail)

Phase 11: Personalization Backend (requires Phases 4 + 5)
    |
Phase 12: Personalization Frontend (requires Phase 11 + 7)
    |
Phase 13: Insights Backend + Frontend (requires Phase 11)
    |
Phase 14: Privacy Controls (requires Phases 4 + 5 + 6)
    |
Phase 15: Contract Consolidation (requires Phases 12 + 13)
    |
Phase 16: Final Hardening + Full Test Suite (requires all)
```

**Parallelization**: Phases 3, 4, 5, 6 can run concurrently after Phase 2. Phases 7-10 can run concurrently after their respective backends + Phase 3.

---

## Phase 0 -- Foundation and Regression Guardrails

**Objective:** Extend configuration for V2 env vars, establish V1 regression test baseline, create service/schema module scaffolding.

**Why this phase exists:** Every subsequent phase depends on V2 config being present with safe defaults, and on having a regression suite that proves V1 still works.

**Dependencies:** None.

### Tasks

- [x] **0.1 Extend backend config with V2 env vars**
  - **Description:** Add optional settings to the Pydantic `Settings` class for auth, Gmail, and feature flags. All must have safe defaults so the app boots without them.
  - **Files to update:** `apps/api/app/core/config.py`
  - **Schema changes:** None
  - **Expected output:** Settings class gains: `GOOGLE_CLIENT_ID: Optional[str] = None`, `GOOGLE_CLIENT_SECRET: Optional[str] = None`, `GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"`, `SESSION_SECRET_KEY: str = "change-me-in-production"`, `SESSION_EXPIRY_HOURS: int = 168`, `GMAIL_CLIENT_ID: Optional[str] = None`, `GMAIL_CLIENT_SECRET: Optional[str] = None`, `GMAIL_REDIRECT_URI: str = "http://localhost:8000/api/v1/gmail/connect/callback"`, `GMAIL_SCOPES: str = "https://www.googleapis.com/auth/gmail.readonly"`, `FRONTEND_URL: str = "http://localhost:3000"`, `PERSONALIZATION_ENABLED: bool = True`, `GMAIL_ENABLED: bool = True`

- [x] **0.2 Create backend module scaffolding**
  - **Description:** Create empty `__init__.py` files and stub schema files for all V2 modules.
  - **Files to create:** `apps/api/app/services/__init__.py`, `apps/api/app/schemas/auth.py`, `apps/api/app/schemas/history.py`, `apps/api/app/schemas/gmail.py`, `apps/api/app/schemas/feedback.py`, `apps/api/app/schemas/preferences.py`, `apps/api/app/schemas/insights.py`
  - **Expected output:** Module directories importable; no runtime behavior change

- [x] **0.3 Write V1 regression test suite**
  - **Description:** Create comprehensive regression tests for all V1 endpoints and response shapes.
  - **Files to create:** `apps/api/tests/test_v1_regression.py`
  - **Tests to include:** `test_health_returns_ok`, `test_models_returns_info`, `test_classify_valid_body`, `test_classify_subject_only`, `test_classify_empty_returns_422`, `test_classify_response_shape_exact` (asserts every field type)
  - **Pattern:** Follow existing `tests/conftest.py` with `FAKE_PREDICT_RESULT` and `patch("ml.src.inference.predict.predict")`

- [x] **0.4 Add frontend V1 smoke tests**
  - **Description:** Create tests verifying the landing page, classify form, and header render correctly.
  - **Files to create:** `apps/web/__tests__/V1Regression.test.tsx`
  - **Tests:** Landing page renders without errors, ClassifyForm renders inputs, Header renders nav links

### Deliverables
- Config extended with safe defaults
- Module scaffolding in place
- V1 regression test suite passing

### Validation Checklist
- [x] All existing tests pass
- [x] New V1 regression tests pass
- [x] App boots without any new env vars set
- [x] `GET /api/v1/health`, `POST /api/v1/classify`, `GET /api/v1/models` work identically

---

## Phase 1 -- Database Schema

**Objective:** Create all V2 SQLAlchemy models and a single Alembic migration. One migration avoids churn and gives all downstream phases clean table access.

**Why this phase exists:** Every V2 feature (auth, history, feedback, rules, personalization) needs database tables. Creating them all upfront simplifies dependency management.

**Dependencies:** Phase 0.

### Tasks

- [x] **1.1 Add all V2 SQLAlchemy models**
  - **Description:** Add 10 new ORM models below existing `ClassificationLog` and `ModelVersionLog` in the same file, sharing the existing `Base`.
  - **Files to update:** `apps/api/app/db/models.py`
  - **Models to add:**
    - `User` -- id (UUID PK), email (String(320) unique), name (String(256) nullable), avatar_url (String(2048) nullable), created_at, updated_at
    - `UserSession` -- id (UUID PK), user_id (FK users.id), token_hash (String(128) unique), created_at, expires_at, is_revoked (Boolean default False). Index on user_id.
    - `OAuthAccount` -- id (UUID PK), user_id (FK users.id), provider (String(32)), provider_account_id (String(256)). Unique constraint on (provider, provider_account_id).
    - `GmailConnection` -- id (UUID PK), user_id (FK users.id, unique), gmail_email (String(320)), access_token_enc (Text), refresh_token_enc (Text), token_expires_at (DateTime tz), scopes (String(1024)), connected_at, disconnected_at (nullable)
    - `ClassificationEvent` -- id (UUID PK), user_id (FK users.id, nullable), request_id (UUID unique), source (String(16): manual/gmail), gmail_message_id (String(256) nullable), subject_snippet (String(256) nullable), sender (String(320) nullable), final_prediction (String(16)), final_risk_score (Float), risk_band (String(16)), review_state (String(16) nullable), personalized (Boolean default False), personalization_reasons (Text nullable, JSON), agreement_ratio (Float), model_version (String(64)), inference_latency_ms (Float), created_at. Indexes: user_id, created_at, source.
    - `FeedbackEvent` -- id (UUID PK), user_id (FK users.id), classification_event_id (FK classification_events.id), feedback_label (String(32)), reason (String(256) nullable), created_at. Unique constraint on (user_id, classification_event_id).
    - `SenderOverride` -- id (UUID PK), user_id (FK users.id), sender (String(320)), action (String(16): trust/block), created_at. Unique on (user_id, sender).
    - `DomainOverride` -- id (UUID PK), user_id (FK users.id), domain (String(256)), action (String(16): trust/block), created_at. Unique on (user_id, domain).
    - `UserPreferences` -- id (UUID PK), user_id (FK users.id, unique), sensitivity (String(16) default "balanced"), personalization_enabled (Boolean default True), review_band_enabled (Boolean default True), updated_at
    - `PersonalizationProfile` -- id (UUID PK), user_id (FK users.id, unique), total_classifications (Integer default 0), total_feedback (Integer default 0), false_positive_count (Integer default 0), false_negative_count (Integer default 0), score_adjustment (Float default 0.0), updated_at
  - **Constraint:** Do NOT modify existing `ClassificationLog` or `ModelVersionLog`.

- [x] **1.2 Create Alembic migration 0002**
  - **Description:** Create migration `0002_v2_tables.py` with revision chain 0001 -> 0002. Creates all 10 new tables with indexes, unique constraints, and foreign keys. Does NOT touch existing tables.
  - **Files to create:** `apps/api/alembic/versions/0002_v2_tables.py`
  - **Expected output:** `alembic upgrade head` creates all tables; `alembic downgrade 0001` drops them cleanly

### Deliverables
- 10 new SQLAlchemy models
- Single Alembic migration creating all V2 tables
- Existing V1 tables untouched

### Validation Checklist
- [x] `alembic upgrade head` succeeds
- [x] `alembic downgrade 0001` succeeds
- [x] V1 regression tests pass
- [x] `classification_log` and `model_version_log` are untouched

---

## Phase 2 -- Auth Backend

**Objective:** Implement Google sign-in, session management, user creation, and auth dependency injection.

**Why this phase exists:** Every V2 feature requires knowing who the user is. Auth is the foundational layer.

**Dependencies:** Phase 1.

### Tasks

- [x] **2.1 Create auth schemas**
  - **Description:** Pydantic models for auth request/response.
  - **Files to create:** `apps/api/app/schemas/auth.py`
  - **Interfaces:** `GoogleAuthStartResponse(auth_url: str, state: str)`, `UserResponse(id, email, name, avatar_url, gmail_connected, preferences: UserPreferencesResponse)`, `UserPreferencesResponse(sensitivity, personalization_enabled)`, `LogoutResponse(success: bool)`

- [x] **2.2 Create auth service**
  - **Description:** Service for Google OAuth code exchange and user upsert.
  - **Files to create:** `apps/api/app/services/auth_service.py`
  - **Methods:** `exchange_google_code(code: str) -> dict` (httpx async to Google token endpoint + userinfo), `find_or_create_user(email, name, avatar_url, provider_account_id) -> User`
  - **APIs used:** `https://oauth2.googleapis.com/token`, `https://www.googleapis.com/oauth2/v2/userinfo`

- [x] **2.3 Create session service**
  - **Description:** Secure session token generation, validation, and revocation.
  - **Files to create:** `apps/api/app/services/session_service.py`
  - **Methods:** `create_session(user_id) -> (token, UserSession)`, `validate_session(token) -> Optional[User]`, `revoke_session(token) -> bool`
  - **Token strategy:** `secrets.token_urlsafe(48)`, stored as `hashlib.sha256(token).hexdigest()`

- [x] **2.4 Create auth dependency**
  - **Description:** FastAPI dependency functions for extracting the current user from request.
  - **Files to create:** `apps/api/app/api/deps.py`
  - **Functions:** `get_current_user(request) -> User` (raises 401), `get_optional_user(request) -> Optional[User]` (returns None)
  - **Cookie name:** `spamshield_session`. Also accepts `Authorization: Bearer <token>` header.

- [x] **2.5 Create auth routes**
  - **Description:** FastAPI router with Google OAuth endpoints.
  - **Files to create:** `apps/api/app/api/v1/auth.py`
  - **Routes:** `GET /auth/google/start` -> GoogleAuthStartResponse, `GET /auth/google/callback?code=&state=` -> redirect to FRONTEND_URL/app (sets cookie), `POST /auth/logout` -> LogoutResponse (clears cookie), `GET /me` -> UserResponse

- [x] **2.6 Register auth router**
  - **Description:** Add auth router to the V1 router without modifying existing routers.
  - **Files to update:** `apps/api/app/api/v1/__init__.py`
  - **Change:** `router.include_router(auth_router, tags=["auth"])`

- [x] **2.7 Add httpx and cryptography dependencies**
  - **Description:** Add runtime dependencies needed for OAuth and token encryption.
  - **Files to update:** `apps/api/requirements/base.txt`
  - **Add:** `httpx>=0.27.0`, `cryptography>=42.0.0`

- [x] **2.8 Create auth tests**
  - **Description:** Tests with mocked Google OAuth.
  - **Files to create:** `apps/api/tests/test_auth.py`
  - **Tests:** google_start returns auth_url, callback creates user + session, invalid state rejected, /me requires auth, /me returns user data with valid session, logout clears session, V1 classify still works without auth

### Deliverables
- Google sign-in flow (start -> callback -> session cookie)
- Session validation dependency
- /me endpoint for current user
- Logout flow

### Validation Checklist
- [x] All V1 regression tests pass
- [x] POST /api/v1/classify works without any auth headers
- [x] GET /api/v1/auth/google/start returns auth_url
- [x] Auth callback creates user and session (mocked)
- [x] GET /api/v1/me returns 401 without session, 200 with valid session
- [x] POST /api/v1/auth/logout clears session

---

## Phase 3 -- Auth Frontend

**Objective:** Add auth context, sign-in/sign-out UI, Next.js middleware for /app route protection, and workspace route group scaffold.

**Why this phase exists:** Unlocks all authenticated frontend features. Required before any /app/* pages.

**Dependencies:** Phase 2.

### Tasks

- [x] **3.1 Create frontend auth API client**
  - **Description:** HTTP client functions for auth endpoints.
  - **Files to create:** `apps/web/lib/api/auth.ts`
  - **Functions:** `startGoogleAuth() -> { auth_url, state }`, `getCurrentUser() -> UserResponse | null`, `logout() -> void`. All use `credentials: "include"`.

- [x] **3.2 Create auth context/provider**
  - **Description:** React context providing auth state to the entire app.
  - **Files to create:** `apps/web/contexts/AuthContext.tsx`
  - **Provides:** `user`, `isLoading`, `isAuthenticated`, `login()`, `logout()`, `refreshUser()`

- [x] **3.3 Create auth hook**
  - **Description:** Thin wrapper around useContext.
  - **Files to create:** `apps/web/hooks/useAuth.ts`
  - **Export:** `useAuth() { return useContext(AuthContext) }`

- [x] **3.4 Wrap layout with AuthProvider**
  - **Description:** Add AuthProvider to the root layout. Keep all existing layout intact.
  - **Files to update:** `apps/web/app/layout.tsx`
  - **Change:** Wrap `{children}` with `<AuthProvider>`. No other changes.

- [x] **3.5 Add sign-in button to Header**
  - **Description:** Conditionally render auth UI in the header.
  - **Files to update:** `apps/web/components/layout/Header.tsx`
  - **When not authenticated:** "Sign In" button (next to existing "Try Demo" CTA)
  - **When authenticated:** User avatar + name + "Open App" link + "Sign Out"
  - **Constraint:** Keep all existing nav links and "Try Demo" CTA intact.

- [x] **3.6 Create /app route group**
  - **Description:** Workspace shell layout and home page for authenticated users.
  - **Files to create:** `apps/web/app/app/layout.tsx` (sidebar nav: History, Gmail, Settings, Insights), `apps/web/app/app/page.tsx` (workspace home with quick-access cards)

- [x] **3.7 Create auth callback page**
  - **Description:** Handles redirect from Google OAuth. Refreshes user and redirects to /app.
  - **Files to create:** `apps/web/app/auth/callback/page.tsx`

- [x] **3.8 Create Next.js middleware**
  - **Description:** Protects /app/* routes by checking for session cookie. Does NOT protect / or /auth/*.
  - **Files to create:** `apps/web/middleware.ts`
  - **Logic:** Check for `spamshield_session` cookie. If missing on /app/*, redirect to /.

### Deliverables
- Auth context available app-wide
- Sign-in/sign-out in header
- Protected /app workspace shell
- OAuth callback handling

### Validation Checklist
- [x] Landing page `/` renders identically when logged out
- [x] Sign-in button appears in header
- [x] `/app` redirects to `/` when not authenticated
- [x] After sign-in, header shows user info and "Open App" link
- [ ] All existing frontend tests pass

---

## Phase 4 -- History Backend

**Objective:** Implement per-user classification history and extend the classify endpoint to optionally write user-scoped history.

**Why this phase exists:** Per-user history is the core persistence feature. It also bridges V1 classify into the V2 user model.

**Dependencies:** Phase 2.

### Tasks

- [x] **4.1 Create history schemas**
  - **Description:** Pydantic models for history API.
  - **Files to create:** `apps/api/app/schemas/history.py`
  - **Models:** `HistoryItemResponse(id, source, subject, sender, final_prediction, final_risk_score, risk_band, personalized, saved_at)`, `HistoryDetailResponse(extends HistoryItemResponse + review_state, personalization_reasons, agreement_ratio, model_version, feedback)`, `HistoryListResponse(items, next_cursor)`, `ClearHistoryResponse(deleted_count)`

- [x] **4.2 Create history service**
  - **Description:** CRUD operations for classification events, all user-scoped.
  - **Files to create:** `apps/api/app/services/history_service.py`
  - **Methods:** `create_event(user_id, source, subject_snippet, sender, classify_result, ...) -> ClassificationEvent`, `list_events(user_id, cursor, limit, source_filter, verdict_filter, query) -> (list, next_cursor)` (cursor-based pagination), `get_event(user_id, event_id) -> Optional[ClassificationEvent]`, `delete_event(user_id, event_id) -> bool`, `clear_events(user_id) -> int`
  - **Privacy:** subject_snippet truncated to 256 chars. No raw body stored.

- [x] **4.3 Create classification service wrapper**
  - **Description:** Wraps `predict()` and optionally writes to `classification_events` for authenticated users.
  - **Files to create:** `apps/api/app/services/classification_service.py`
  - **Methods:** `classify_manual(subject, body, artifacts, user=None) -> (ClassifyResponse, Optional[event_id])`. If user is None, behavior identical to V1. Still runs existing background task for V1 `classification_log`.

- [x] **4.4 Extend classify route for optional user context**
  - **Description:** Inject `get_optional_user` dependency into the classify endpoint. If user present, delegate to classification_service which writes history. Response shape MUST NOT change.
  - **Files to update:** `apps/api/app/api/v1/classify.py`
  - **Change:** Add `user: Optional[User] = Depends(get_optional_user)` parameter. Call `classification_service.classify_manual()`. Keep existing `_persist_classification` background task.
  - **Constraint:** `ClassifyResponse` shape is IDENTICAL with or without auth. This is non-negotiable.

- [x] **4.5 Create history routes**
  - **Description:** CRUD API for user history.
  - **Files to create:** `apps/api/app/api/v1/history.py`
  - **Routes:** `GET /history` (paginated, filterable), `GET /history/{history_id}`, `DELETE /history/{history_id}`, `POST /history/clear`. All require auth via `get_current_user`.
  - **Files to update:** `apps/api/app/api/v1/__init__.py` (register router)

- [x] **4.6 Create history tests**
  - **Description:** Tests for history isolation, pagination, and V1 regression.
  - **Files to create:** `apps/api/tests/test_history.py`
  - **Tests:** Authenticated classify creates history event, anonymous classify does NOT create event, User A cannot see User B's history, pagination works, delete removes only specified item, clear removes all for user only, V1 classify response shape unchanged

### Deliverables
- Per-user classification history via `classification_events` table
- Classify endpoint optionally writes user history
- History CRUD API
- V1 classify response unchanged

### Validation Checklist
- [x] POST /api/v1/classify without auth returns exact same response shape
- [x] POST /api/v1/classify with auth writes to classification_events
- [x] GET /api/v1/history returns user-scoped results only
- [x] User isolation verified (cross-user access returns 404)
- [x] All V1 regression tests pass

---

## Phase 5 -- Feedback, Rules, and Preferences Backend

**Objective:** Implement feedback collection, sender/domain override rules, and user sensitivity preferences.

**Why this phase exists:** These are the inputs to the personalization engine (Phase 11). Feedback captures user corrections; rules are explicit overrides; preferences set thresholds.

**Dependencies:** Phase 2.

### Tasks

- [x] **5.1 Create feedback schemas**
  - **Description:** Request/response models for feedback API.
  - **Files to create:** `apps/api/app/schemas/feedback.py`
  - **Models:** `FeedbackRequest(history_id, feedback_label: Literal["correct_spam","correct_safe","false_positive","false_negative","not_sure"], reason: Optional)`, `FeedbackResponse(success, feedback_id, rule_suggestion: Optional[RuleSuggestion])`, `RuleSuggestion(type, value, suggested)`

- [x] **5.2 Create preferences schemas**
  - **Description:** Request/response models for preferences and rules APIs.
  - **Files to create:** `apps/api/app/schemas/preferences.py`
  - **Models:** `PreferencesResponse(sensitivity, personalization_enabled, review_band_enabled)`, `PreferencesUpdateRequest(sensitivity?, personalization_enabled?, review_band_enabled?)`, `RulesResponse(senders: list[SenderRuleItem], domains: list[DomainRuleItem])`, `SenderRuleRequest(sender, action: trust|block)`, `DomainRuleRequest(domain, action: trust|block)`

- [x] **5.3 Create feedback service**
  - **Description:** Feedback CRUD with rule suggestion logic.
  - **Files to create:** `apps/api/app/services/feedback_service.py`
  - **Methods:** `submit_feedback(user_id, history_id, label, reason) -> FeedbackEvent`, `delete_feedback(user_id, feedback_id) -> bool`, `get_feedback_for_event(user_id, event_id) -> Optional[FeedbackEvent]`, `suggest_rule(event, label) -> Optional[RuleSuggestion]` (e.g., false_positive on known sender -> suggest trust_sender)

- [x] **5.4 Create rules service**
  - **Description:** CRUD for sender/domain overrides with lookup methods.
  - **Files to create:** `apps/api/app/services/rules_service.py`
  - **Methods:** `get_rules(user_id) -> (list[SenderOverride], list[DomainOverride])`, `add_sender_rule(user_id, sender, action) -> SenderOverride`, `add_domain_rule(user_id, domain, action) -> DomainOverride`, `delete_rule(user_id, rule_id) -> bool`, `check_sender(user_id, sender) -> Optional[str]` (trust/block/None), `check_domain(user_id, domain) -> Optional[str]`

- [x] **5.5 Create preferences service**
  - **Description:** Get or create user preferences with update logic.
  - **Files to create:** `apps/api/app/services/preferences_service.py`
  - **Methods:** `get_or_create_preferences(user_id) -> UserPreferences`, `update_preferences(user_id, updates) -> UserPreferences`

- [x] **5.6 Create feedback and preferences routes**
  - **Description:** API routes for feedback, preferences, and rules CRUD.
  - **Files to create:** `apps/api/app/api/v1/feedback.py` (POST /feedback, DELETE /feedback/{id}), `apps/api/app/api/v1/preferences.py` (GET /preferences, PUT /preferences, GET /rules, POST /rules/senders, POST /rules/domains, DELETE /rules/{id})
  - **Files to update:** `apps/api/app/api/v1/__init__.py` (register both routers)

- [x] **5.7 Create feedback and preferences tests**
  - **Description:** Tests for feedback submission, rules CRUD, and user isolation.
  - **Files to create:** `apps/api/tests/test_feedback.py`, `apps/api/tests/test_preferences.py`
  - **Key tests:** Submit feedback, delete feedback, duplicate handling (unique constraint), user isolation, get/update preferences, add/delete sender rule, add/delete domain rule, user A's rules don't affect user B

### Deliverables
- Feedback API (submit, delete, rule suggestions)
- Rules API (sender/domain trust/block CRUD)
- Preferences API (sensitivity, personalization toggle)

### Validation Checklist
- [x] Feedback attaches to correct user + classification event
- [x] Duplicate feedback on same event handled (upsert or error)
- [x] Rules are user-scoped
- [x] Preferences default to balanced/true/true
- [x] V1 regression tests pass

---

## Phase 6 -- Gmail Backend

**Objective:** Implement Gmail OAuth connect/disconnect, message fetching, and Gmail-based classification.

**Why this phase exists:** Gmail integration is the primary new data source for V2, allowing users to classify real inbox emails.

**Dependencies:** Phase 2.

### Tasks

- [ ] **6.1 Create Gmail schemas**
  - **Description:** Request/response models for Gmail API.
  - **Files to create:** `apps/api/app/schemas/gmail.py`
  - **Models:** `GmailStatusResponse(connected, email, scopes, connected_at)`, `GmailMessageItem(gmail_message_id, thread_id, subject, from_address, snippet, received_at, has_attachments)`, `GmailMessageListResponse(items, next_cursor)`, `GmailClassifyRequest(gmail_message_id)`, `GmailClassifyBatchRequest(gmail_message_ids: list, max 10)`, `GmailClassifyResponse(history_id, source, message, result)`

- [ ] **6.2 Create Gmail OAuth service**
  - **Description:** Gmail OAuth flow management with encrypted token storage.
  - **Files to create:** `apps/api/app/services/gmail_oauth_service.py`
  - **Methods:** `build_connect_url(user_id) -> (url, state)`, `exchange_code(code) -> (access_token, refresh_token, expires_at, email, scopes)`, `save_connection(user_id, tokens...) -> GmailConnection`, `refresh_token_if_needed(connection) -> GmailConnection`, `disconnect(user_id) -> bool` (revokes token, marks disconnected)
  - **Token encryption:** `cryptography.fernet` with key derived from `SESSION_SECRET_KEY`

- [ ] **6.3 Create Gmail client**
  - **Description:** Async HTTP client wrapping Gmail API.
  - **Files to create:** `apps/api/app/services/gmail_client.py`
  - **Methods:** `list_messages(access_token, cursor, limit, query) -> (list[dict], next_cursor)`, `get_message(access_token, message_id) -> dict`
  - **API base:** `https://gmail.googleapis.com/gmail/v1/users/me`
  - **Error handling:** Rate limiting, pagination, graceful degradation

- [ ] **6.4 Create Gmail message mapper**
  - **Description:** Extract classification input from Gmail API message format.
  - **Files to create:** `apps/api/app/services/gmail_message_mapper.py`
  - **Methods:** `extract_classify_input(gmail_message) -> (subject, body, sender)`. Handles multipart/alternative, text/plain, text/html (strip tags). Truncates body for classification.

- [ ] **6.5 Create Gmail routes**
  - **Description:** Full Gmail integration API.
  - **Files to create:** `apps/api/app/api/v1/gmail.py`
  - **Routes:** `GET /gmail/status`, `GET /gmail/connect/start`, `GET /gmail/connect/callback`, `POST /gmail/disconnect`, `GET /gmail/messages` (paginated), `POST /gmail/classify` (single message), `POST /gmail/classify-batch` (up to 10)
  - **All routes require auth.** Gmail-dependent routes check for active connection.
  - **Files to update:** `apps/api/app/api/v1/__init__.py`

- [ ] **6.6 Create Gmail tests**
  - **Description:** Tests with mocked Gmail API responses.
  - **Files to create:** `apps/api/tests/test_gmail.py`
  - **Tests:** Status reflects connected/disconnected, connect stores encrypted tokens, disconnect clears tokens, message listing paginates, classify maps subject/body correctly, batch respects limit, API errors degrade gracefully (502 not 500), V1 classify unaffected, app boots without Gmail credentials

### Deliverables
- Gmail OAuth connect/disconnect flow
- Message listing with pagination
- Single and batch classification of Gmail messages
- Encrypted token storage

### Validation Checklist
- [ ] App boots without GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET set
- [ ] Gmail routes return appropriate error when Gmail not configured
- [ ] Connected user can list and classify messages (mocked)
- [ ] Disconnect revokes and clears tokens
- [ ] V1 regression tests pass

---

## Phase 7 -- Frontend Workspace Shell

**Objective:** Build the authenticated workspace layout with sidebar navigation for all /app/* pages.

**Why this phase exists:** All authenticated frontend features (history, Gmail, settings, insights) need a consistent shell/layout.

**Dependencies:** Phase 3.

### Tasks

- [ ] **7.1 Build workspace layout**
  - **Description:** Authenticated workspace shell with sidebar navigation.
  - **Files to update:** `apps/web/app/app/layout.tsx`
  - **Features:** Sidebar with nav links (History, Gmail, Settings, Insights), user avatar + name in sidebar header, "Back to Home" link, responsive (sidebar collapses on mobile), consistent with existing design system (glass, gradients, Tailwind tokens)

- [ ] **7.2 Build workspace home**
  - **Description:** Landing page for authenticated workspace.
  - **Files to update:** `apps/web/app/app/page.tsx`
  - **Features:** Quick-access cards linking to History, Gmail, Settings. Recent activity summary stub.

### Deliverables
- Workspace shell with navigation
- Responsive sidebar

### Validation Checklist
- [ ] `/app` renders workspace shell when authenticated
- [ ] `/app` redirects to `/` when not authenticated
- [ ] Sidebar navigation links work
- [ ] Landing page `/` is completely unchanged

---

## Phase 8 -- History Frontend

**Objective:** Build server-backed history UI for authenticated users while preserving anonymous localStorage history.

**Why this phase exists:** Server history is the core "sticky" feature that makes users return.

**Dependencies:** Phase 4, Phase 7.

### Tasks

- [ ] **8.1 Create history API client**
  - **Description:** HTTP client for history endpoints.
  - **Files to create:** `apps/web/lib/api/history.ts`
  - **Functions:** `getHistory(params) -> HistoryListResponse`, `getHistoryItem(id) -> HistoryDetailResponse`, `deleteHistoryItem(id)`, `clearHistory()`

- [ ] **8.2 Create useHistory hook**
  - **Description:** Hook that uses server history when authenticated, falls back to localStorage.
  - **Files to create:** `apps/web/hooks/useHistory.ts`
  - **Behavior:** If `isAuthenticated`, fetch from server API. If not, delegate to existing `useClassifyHistory` hook. Manage pagination, filtering state.
  - **Constraint:** Do NOT modify `useClassifyHistory.ts`. It remains the anonymous fallback.

- [ ] **8.3 Create history page**
  - **Description:** Full history management page in the workspace.
  - **Files to create:** `apps/web/app/app/history/page.tsx`
  - **Features:** Paginated list, filter by source (manual/gmail) and verdict (spam/safe/review), search by subject/sender, click to view detail, delete individual items, clear all

### Deliverables
- Server-backed history page
- Filtering and pagination
- Anonymous fallback preserved

### Validation Checklist
- [ ] Anonymous user: localStorage history works as before
- [ ] Authenticated user: history loads from server
- [ ] Filtering and pagination work
- [ ] Existing ClassifySection history sidebar unchanged for anonymous users

---

## Phase 9 -- Settings and Feedback Frontend

**Objective:** Build settings page and per-classification feedback controls.

**Why this phase exists:** Users need to configure their preferences, manage rules, and provide feedback on classification results.

**Dependencies:** Phase 5, Phase 7.

### Tasks

- [ ] **9.1 Create feedback API client**
  - **Description:** HTTP client for feedback endpoints.
  - **Files to create:** `apps/web/lib/api/feedback.ts`
  - **Functions:** `submitFeedback(historyId, label, reason?)`, `deleteFeedback(feedbackId)`

- [ ] **9.2 Create preferences API client**
  - **Description:** HTTP client for preferences and rules endpoints.
  - **Files to create:** `apps/web/lib/api/preferences.ts`
  - **Functions:** `getPreferences()`, `updatePreferences(updates)`, `getRules()`, `addSenderRule(sender, action)`, `addDomainRule(domain, action)`, `deleteRule(ruleId)`

- [ ] **9.3 Create feedback controls component**
  - **Description:** Feedback buttons shown below classification results for authenticated users.
  - **Files to create:** `apps/web/components/classify/FeedbackControls.tsx`
  - **Buttons:** correct_spam, correct_safe, false_positive, false_negative, not_sure
  - **Constraint:** Only rendered when user is authenticated. Does NOT show for anonymous users.

- [ ] **9.4 Create quick rule actions component**
  - **Description:** "Always trust this sender" / "Block this domain" buttons after classification.
  - **Files to create:** `apps/web/components/classify/QuickRuleActions.tsx`
  - **Shown:** After classification with sender/domain info available. Authenticated only.

- [ ] **9.5 Create settings page**
  - **Description:** Full settings management page in workspace.
  - **Files to create:** `apps/web/app/app/settings/page.tsx`
  - **Sections:** Sensitivity (relaxed/balanced/strict radio), personalization toggle, review band toggle, sender rules list with add/delete, domain rules list with add/delete, privacy controls section (clear history, disconnect Gmail, reset personalization, delete account -- with confirmation dialogs)

### Deliverables
- Feedback controls on classification results
- Quick rule actions
- Full settings page with preferences and rules management

### Validation Checklist
- [ ] Feedback buttons submit correctly and update UI
- [ ] Preferences save and reload correctly
- [ ] Rules CRUD works
- [ ] V1 VerdictCard renders identically for anonymous users
- [ ] Feedback controls only visible to authenticated users

---

## Phase 10 -- Gmail Frontend

**Objective:** Build Gmail inbox page with connect/disconnect and classify-from-inbox UX.

**Why this phase exists:** This is the primary new workflow for V2: classifying real inbox emails.

**Dependencies:** Phase 6, Phase 7.

### Tasks

- [ ] **10.1 Create Gmail API client**
  - **Description:** HTTP client for Gmail endpoints.
  - **Files to create:** `apps/web/lib/api/gmail.ts`
  - **Functions:** `getGmailStatus()`, `startGmailConnect()`, `disconnectGmail()`, `getGmailMessages(params)`, `classifyGmailMessage(messageId)`, `classifyGmailBatch(messageIds)`

- [ ] **10.2 Create useGmail hook**
  - **Description:** Hook managing Gmail connection state and message list.
  - **Files to create:** `apps/web/hooks/useGmail.ts`
  - **State:** connection status, messages, loading, pagination

- [ ] **10.3 Create Gmail page**
  - **Description:** Gmail inbox browsing and classification page.
  - **Files to create:** `apps/web/app/app/gmail/page.tsx`
  - **States:** Not connected (Connect Gmail CTA), connected (message list with pagination/search), classify mode (select messages -> classify button -> inline results)

- [ ] **10.4 Create Gmail components**
  - **Description:** UI components for Gmail message display and classification.
  - **Files to create:** `apps/web/components/gmail/GmailMessageList.tsx`, `apps/web/components/gmail/GmailMessageRow.tsx`, `apps/web/components/gmail/GmailClassifyResult.tsx`

### Deliverables
- Gmail connect/disconnect UX
- Message listing with pagination
- Single and batch classification from inbox

### Validation Checklist
- [ ] Gmail page shows connect CTA when not connected
- [ ] After connect, messages load with pagination
- [ ] Classification works for selected messages
- [ ] V1 landing page and manual classify unaffected

---

## Phase 11 -- Personalization Backend

**Objective:** Implement the personalization scoring layer that adjusts global model output based on user rules, sensitivity, and feedback history.

**Why this phase exists:** This is the core differentiator of V2 -- making the classifier adapt to each user's preferences without retraining the global model.

**Dependencies:** Phase 4, Phase 5.

### Tasks

- [ ] **11.1 Create personalization service**
  - **Description:** Core personalization algorithm that takes global predict() output and applies user-specific adjustments.
  - **Files to create:** `apps/api/app/services/personalization_service.py`
  - **Core method:** `personalize(user_id, global_result, sender, domain, session) -> PersonalizationResult`
  - **Algorithm:**
    1. Load user preferences (sensitivity, personalization_enabled, review_band_enabled)
    2. If not personalization_enabled, return global result as-is
    3. Check sender overrides: trust -> force not_spam + "trusted_sender_override"; block -> force spam + "blocked_sender_override"
    4. Check domain overrides: same logic
    5. Load personalization profile (score_adjustment from feedback history)
    6. Apply sensitivity threshold: relaxed=0.65, balanced=0.50, strict=0.35
    7. Apply feedback-derived score_adjustment (bounded [-0.15, +0.15])
    8. Compute adjusted_score = global_risk_score + score_adjustment
    9. Determine review_state: if review_band_enabled and score within 0.1 of threshold -> "review"; if >= threshold -> "spam"; else "not_spam"
    10. Compile personalization_reasons list
  - **Return type:** `PersonalizationResult(final_prediction, final_risk_score, risk_band, review_state, personalized: bool, personalization_reasons: list[str])`

- [ ] **11.2 Add profile update to feedback service**
  - **Description:** Recompute personalization profile after each feedback submission.
  - **Files to update:** `apps/api/app/services/feedback_service.py`
  - **New method:** `update_personalization_profile(user_id)` -- queries all feedback, calculates false_positive_count/false_negative_count, derives score_adjustment = (false_negative_count - false_positive_count) * 0.02 clamped to [-0.15, +0.15], updates PersonalizationProfile
  - **Called:** After every `submit_feedback()` call

- [ ] **11.3 Integrate personalization into classification service**
  - **Description:** Call personalization after predict() for authenticated users.
  - **Files to update:** `apps/api/app/services/classification_service.py`
  - **Change:** After `predict()`, if user is authenticated and personalization enabled, call `personalization_service.personalize()`. Use personalized result for ClassificationEvent record. Return both global and personalized data.

- [ ] **11.4 Extend ClassifyResponse with optional personalization fields**
  - **Description:** Add optional fields to the classify response schema. They are `None` for anonymous requests (backward compatible).
  - **Files to update:** `apps/api/app/schemas/classify.py`
  - **Add:** `personalized: Optional[bool] = None`, `review_state: Optional[str] = None`, `personalization_reasons: Optional[list[str]] = None`

- [ ] **11.5 Create personalization tests**
  - **Description:** Comprehensive tests for the personalization algorithm.
  - **Files to create:** `apps/api/tests/test_personalization.py`
  - **Tests:** No rules + no feedback = global unchanged, trust sender forces not_spam, block domain forces spam, strict sensitivity lowers threshold (more spam), relaxed raises threshold (less spam), feedback adjustment shifts score within bounds, review band triggers in uncertainty zone, anonymous classify returns None for personalization fields (regression), feedback loop: repeated false_positive shifts future scores

### Deliverables
- Personalization scoring algorithm
- Feedback-driven profile updates
- Personalized classify results for authenticated users
- V1-compatible response (null personalization fields for anonymous)

### Validation Checklist
- [ ] Anonymous classify: personalized/review_state/personalization_reasons all null
- [ ] Authenticated with no rules: result matches global model
- [ ] Trusted sender: always not_spam with reason
- [ ] Blocked domain: always spam with reason
- [ ] Strict sensitivity: more spam detections than balanced
- [ ] Feedback loop works: repeated false_positive shifts scores
- [ ] V1 regression tests pass

---

## Phase 12 -- Personalization Frontend

**Objective:** Display personalization metadata in classification results, show review band, explain decision sources.

**Why this phase exists:** Users need to see WHY a result was personalized and understand the difference between global model and personal adjustments.

**Dependencies:** Phase 11, Phase 7.

### Tasks

- [ ] **12.1 Extend VerdictCard for personalization**
  - **Description:** Show personalization badge, review state, and explanation chips when present. When personalized is null/false, render identically to V1.
  - **Files to update:** `apps/web/components/classify/VerdictCard.tsx`
  - **When `personalized: true`:** "Personalized" badge, review_state display (if "review"), personalization_reasons as chips distinguishing: "Global Model", "Sender Override", "Sensitivity Threshold", "Feedback Adjustment"
  - **When `personalized` null/false:** Render IDENTICALLY to current V1.

- [ ] **12.2 Update shared types**
  - **Description:** Add personalization fields to shared TypeScript types.
  - **Files to update:** `packages/types/index.ts`, `apps/web/lib/api/classify.ts`
  - **Add to ClassifyResponse:** `personalized?: boolean`, `review_state?: "spam" | "not_spam" | "review"`, `personalization_reasons?: string[]`

### Deliverables
- Personalization-aware VerdictCard
- Updated shared types

### Validation Checklist
- [ ] Anonymous classify: VerdictCard renders identically to V1
- [ ] Authenticated with personalization: badges and reasons display correctly
- [ ] Review state shows distinct UI treatment
- [ ] No regressions in existing VerdictCard behavior

---

## Phase 13 -- Insights Backend + Frontend

**Objective:** Implement user dashboard with summary statistics.

**Why this phase exists:** Users want to see their classification patterns, feedback trends, and most flagged domains.

**Dependencies:** Phase 11.

### Tasks

- [ ] **13.1 Create insights service**
  - **Description:** Aggregation queries for user summary stats.
  - **Files to create:** `apps/api/app/services/insights_service.py`
  - **Method:** `get_summary(user_id) -> InsightsSummary` returning: total_classifications, spam_detected, safe_detected, review_count, false_positive_count, false_negative_count, top_flagged_domains (list of {domain, count})

- [ ] **13.2 Create insights schema and route**
  - **Description:** API endpoint for dashboard data.
  - **Files to create:** `apps/api/app/schemas/insights.py`, `apps/api/app/api/v1/insights.py`
  - **Route:** `GET /api/v1/insights/summary` (requires auth)
  - **Files to update:** `apps/api/app/api/v1/__init__.py`

- [ ] **13.3 Create insights page**
  - **Description:** Dashboard page with stats and charts.
  - **Files to create:** `apps/web/app/app/insights/page.tsx`
  - **Features:** Stats cards (total, spam, safe, review), feedback breakdown, top flagged domains, use recharts (already a dependency)
  - **Empty state:** Graceful message when no data yet

### Deliverables
- Insights API
- Dashboard page with charts

### Validation Checklist
- [ ] Insights reflect real user data accurately
- [ ] Empty state renders gracefully
- [ ] V1 unaffected

---

## Phase 14 -- Privacy Controls

**Objective:** Implement end-to-end privacy operations: disconnect Gmail, clear history, reset personalization, delete account.

**Why this phase exists:** Legal/compliance requirement. Users must control their data.

**Dependencies:** Phase 4, Phase 5, Phase 6.

### Tasks

- [ ] **14.1 Create privacy service**
  - **Description:** Centralized service for all data deletion operations.
  - **Files to create:** `apps/api/app/services/privacy_service.py`
  - **Methods:**
    - `disconnect_gmail(user_id)` -- revoke tokens via Google API, delete GmailConnection row
    - `clear_history(user_id)` -- delete all classification_events + associated feedback_events
    - `reset_personalization(user_id)` -- zero out PersonalizationProfile, delete all sender_overrides + domain_overrides, reset preferences to defaults
    - `delete_account(user_id)` -- cascade delete: sessions, oauth_accounts, gmail_connections, classification_events, feedback_events, sender_overrides, domain_overrides, user_preferences, personalization_profiles, user row. Revoke all active sessions.

- [ ] **14.2 Create account deletion route**
  - **Description:** Endpoint for full account deletion.
  - **Files to create or update:** Add `POST /api/v1/account/delete` route (requires auth, deletes everything)
  - **Confirm:** Other privacy actions (clear history, disconnect Gmail) already exist in their respective routes from Phases 4-6.

- [ ] **14.3 Verify frontend privacy controls**
  - **Description:** Ensure settings page from Phase 9 has working privacy buttons.
  - **Files to verify/update:** `apps/web/app/app/settings/page.tsx`
  - **Required:** "Clear All History" (with confirmation), "Disconnect Gmail" (with confirmation), "Reset Personalization" (with confirmation), "Delete Account" (with double confirmation + redirect to /)

- [ ] **14.4 Create privacy tests**
  - **Description:** Verify cascade deletion and data cleanup.
  - **Files to create:** `apps/api/tests/test_privacy.py`
  - **Tests:** After disconnect_gmail, no connection rows remain; after clear_history, no events remain; after reset_personalization, profile zeroed and rules deleted; after delete_account, no user data exists in any table

### Deliverables
- Complete data deletion flows
- Account deletion with cascade
- Verified privacy controls in UI

### Validation Checklist
- [ ] Disconnect Gmail: connection row gone, tokens revoked
- [ ] Clear history: all classification_events deleted for user
- [ ] Reset personalization: profile zeroed, rules deleted
- [ ] Delete account: no user data in any table
- [ ] V1 unaffected

---

## Phase 15 -- Contract Consolidation

**Objective:** Eliminate type drift between frontend and backend. Ensure all V2 types are centralized.

**Why this phase exists:** Prevents subtle bugs from mismatched interfaces between Pydantic and TypeScript.

**Dependencies:** Phase 12, Phase 13.

### Tasks

- [ ] **15.1 Audit type drift**
  - **Description:** Compare all frontend TypeScript interfaces against backend Pydantic schemas. Identify any mismatches in field names, types, or optionality.
  - **Files to audit:** All `apps/web/lib/api/*.ts` interfaces vs `apps/api/app/schemas/*.py` models vs `packages/types/index.ts`

- [ ] **15.2 Update shared types package**
  - **Description:** Add all V2 types to the shared package.
  - **Files to update:** `packages/types/index.ts`
  - **Add:** UserResponse, HistoryItemResponse, HistoryDetailResponse, FeedbackLabel (type), SensitivityLevel (type), GmailMessageItem, GmailStatusResponse, RulesResponse, PreferencesResponse, InsightsSummary, PersonalizationResult fields

- [ ] **15.3 Update frontend imports**
  - **Description:** Where practical, import from packages/types instead of local duplicates.
  - **Files to update:** Various `apps/web/lib/api/*.ts` files
  - **Goal:** Single source of truth for all API types

### Deliverables
- No type contradictions between frontend and backend
- Shared types package is comprehensive

### Validation Checklist
- [ ] `pnpm build` passes in apps/web
- [ ] No duplicate type definitions remain
- [ ] All API response shapes match between frontend and backend

---

## Phase 16 -- Final Hardening and Full Test Suite

**Objective:** Comprehensive test coverage, performance sanity, final V1 regression gate. This is the release gate.

**Why this phase exists:** V2 is only acceptable if: new features work AND V1 still works.

**Dependencies:** All previous phases.

### Tasks

- [ ] **16.1 Create backend integration tests**
  - **Description:** End-to-end scenario tests covering all V2 flows.
  - **Files to create:** `apps/api/tests/test_integration.py`
  - **Scenarios:**
    1. Anonymous user classifies -> V1 response shape, no server history
    2. User signs in -> classifies -> history created -> feedback submitted -> personalization changes future result
    3. Gmail user: connect -> list -> classify -> result has personalization
    4. User A cannot access User B data (history, rules, feedback, gmail)

- [ ] **16.2 Create frontend component tests**
  - **Description:** Tests for all new V2 components.
  - **Files to create:** `apps/web/__tests__/V2Components.test.tsx`
  - **Tests:** Auth context state transitions, history page rendering with mock data, settings page form interactions, Gmail page states (connected/disconnected)

- [ ] **16.3 Run final V1 regression**
  - **Description:** Complete V1 regression suite one final time.
  - **Verify:** GET /api/v1/health returns {"status":"ok"}, GET /api/v1/models returns model info, POST /api/v1/classify returns full ClassifyResponse with all original fields, homepage renders all sections, anonymous history works via localStorage, no auth required for any V1 flow

- [ ] **16.4 Performance sanity checks**
  - **Description:** Verify no performance regressions.
  - **Checks:** Manual classify latency not regressed >20%, history page loads <500ms for <100 items, Gmail message listing paginates (no full load), batch Gmail classify respects 10-message limit

- [ ] **16.5 Four-state boot verification**
  - **Description:** Verify app boots and degrades gracefully in all supported states.
  - **States:** Anonymous no-DB (V1 behavior), authenticated no-Gmail (manual classify + history + feedback), authenticated with Gmail (full inbox workflow), authenticated with personalization (rules + feedback adjust scores)

### Deliverables
- Full test suite passing
- V1 identical to pre-V2
- No security issues
- Performance within bounds

### Validation Checklist
- [ ] ALL backend tests green
- [ ] ALL frontend tests green
- [ ] V1 regression suite passes
- [ ] App boots in all four states
- [ ] No user isolation failures
- [ ] No sensitive data in logs

---

## Phase Dependency Matrix

| Phase | Depends On | Can Parallelize With | Risk Level |
|---|---|---|---|
| 0 | -- | -- | Low |
| 1 | 0 | -- | Low |
| 2 | 1 | -- | Medium (OAuth) |
| 3 | 2 | 4, 5, 6 | Medium |
| 4 | 2 | 3, 5, 6 | Medium |
| 5 | 2 | 3, 4, 6 | Low |
| 6 | 2 | 3, 4, 5 | High (Gmail API) |
| 7 | 3 | 8, 9, 10 | Low |
| 8 | 4, 7 | 9, 10 | Low |
| 9 | 5, 7 | 8, 10 | Low |
| 10 | 6, 7 | 8, 9 | Medium |
| 11 | 4, 5 | -- | High (core algo) |
| 12 | 11, 7 | 13 | Low |
| 13 | 11 | 12, 14 | Low |
| 14 | 4, 5, 6 | 13 | Medium |
| 15 | 12, 13 | -- | Low |
| 16 | All | -- | Low |

---

## Complete File Inventory

### Files to CREATE (new, additive)

**Backend schemas (7 files):**
- `apps/api/app/schemas/auth.py`
- `apps/api/app/schemas/history.py`
- `apps/api/app/schemas/gmail.py`
- `apps/api/app/schemas/feedback.py`
- `apps/api/app/schemas/preferences.py`
- `apps/api/app/schemas/insights.py`

**Backend services (13 files):**
- `apps/api/app/services/__init__.py`
- `apps/api/app/services/auth_service.py`
- `apps/api/app/services/session_service.py`
- `apps/api/app/services/classification_service.py`
- `apps/api/app/services/history_service.py`
- `apps/api/app/services/gmail_oauth_service.py`
- `apps/api/app/services/gmail_client.py`
- `apps/api/app/services/gmail_message_mapper.py`
- `apps/api/app/services/feedback_service.py`
- `apps/api/app/services/rules_service.py`
- `apps/api/app/services/preferences_service.py`
- `apps/api/app/services/personalization_service.py`
- `apps/api/app/services/insights_service.py`
- `apps/api/app/services/privacy_service.py`

**Backend routes (6 files):**
- `apps/api/app/api/v1/auth.py`
- `apps/api/app/api/v1/history.py`
- `apps/api/app/api/v1/gmail.py`
- `apps/api/app/api/v1/feedback.py`
- `apps/api/app/api/v1/preferences.py`
- `apps/api/app/api/v1/insights.py`

**Backend deps (1 file):**
- `apps/api/app/api/deps.py`

**Backend migration (1 file):**
- `apps/api/alembic/versions/0002_v2_tables.py`

**Backend tests (8 files):**
- `apps/api/tests/test_v1_regression.py`
- `apps/api/tests/test_auth.py`
- `apps/api/tests/test_history.py`
- `apps/api/tests/test_feedback.py`
- `apps/api/tests/test_preferences.py`
- `apps/api/tests/test_gmail.py`
- `apps/api/tests/test_personalization.py`
- `apps/api/tests/test_privacy.py`
- `apps/api/tests/test_integration.py`

**Frontend API clients (5 files):**
- `apps/web/lib/api/auth.ts`
- `apps/web/lib/api/history.ts`
- `apps/web/lib/api/gmail.ts`
- `apps/web/lib/api/feedback.ts`
- `apps/web/lib/api/preferences.ts`

**Frontend contexts (1 file):**
- `apps/web/contexts/AuthContext.tsx`

**Frontend hooks (3 files):**
- `apps/web/hooks/useAuth.ts`
- `apps/web/hooks/useHistory.ts`
- `apps/web/hooks/useGmail.ts`

**Frontend pages (6 files):**
- `apps/web/app/app/layout.tsx`
- `apps/web/app/app/page.tsx`
- `apps/web/app/app/history/page.tsx`
- `apps/web/app/app/gmail/page.tsx`
- `apps/web/app/app/settings/page.tsx`
- `apps/web/app/app/insights/page.tsx`
- `apps/web/app/auth/callback/page.tsx`

**Frontend middleware (1 file):**
- `apps/web/middleware.ts`

**Frontend components (5+ files):**
- `apps/web/components/classify/FeedbackControls.tsx`
- `apps/web/components/classify/QuickRuleActions.tsx`
- `apps/web/components/gmail/GmailMessageList.tsx`
- `apps/web/components/gmail/GmailMessageRow.tsx`
- `apps/web/components/gmail/GmailClassifyResult.tsx`

**Frontend tests (2 files):**
- `apps/web/__tests__/V1Regression.test.tsx`
- `apps/web/__tests__/V2Components.test.tsx`

### Files to MODIFY (minimal, backward-compatible)

- `apps/api/app/core/config.py` -- add V2 env vars with safe defaults
- `apps/api/app/db/models.py` -- add 10 new models below existing
- `apps/api/app/api/v1/__init__.py` -- register 6 new routers
- `apps/api/app/api/v1/classify.py` -- add `get_optional_user` dependency
- `apps/api/app/schemas/classify.py` -- add 3 optional personalization fields
- `apps/api/requirements/base.txt` -- add httpx, cryptography
- `apps/web/app/layout.tsx` -- wrap with AuthProvider
- `apps/web/components/layout/Header.tsx` -- add auth UI
- `apps/web/components/classify/VerdictCard.tsx` -- add personalization display
- `packages/types/index.ts` -- add V2 types
- `apps/web/lib/api/classify.ts` -- add optional personalization fields to interface

### Files NEVER modified

- `apps/api/app/api/v1/health.py`
- `apps/api/app/db/session.py`
- `apps/api/alembic/versions/0001_create_classification_log.py`
- `ml/src/inference/predict.py`
- `ml/src/features/pipeline.py`
- `ml/src/features/handcrafted.py`
- `ml/src/features/text_normalizer.py`
- `apps/web/app/page.tsx`
- `apps/web/components/sections/Hero.tsx`
- `apps/web/components/sections/HowItWorks.tsx`
- `apps/web/components/sections/WhyItMatters.tsx`
- `apps/web/components/sections/ProductPreview.tsx`
- `apps/web/components/sections/MetricsStrip.tsx`
- `apps/web/components/sections/FinalCTA.tsx`
- `apps/web/components/sections/Footer.tsx`
- `apps/web/components/hero/*`
- `apps/web/hooks/useClassifyHistory.ts`
- `apps/web/hooks/useAutoDemo.ts`
- `apps/web/hooks/useReducedMotion.ts`

---

## Claude Code Execution Prompts

### Phase 0

```
Read CLAUDE.md, PRIMER.md, RULES_V2.md. Then implement Phase 0 of Tasks_V2_Improved.md:

1. Extend apps/api/app/core/config.py with V2 env vars (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, SESSION_SECRET_KEY, SESSION_EXPIRY_HOURS, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI, GMAIL_SCOPES, FRONTEND_URL, PERSONALIZATION_ENABLED, GMAIL_ENABLED). All must have safe defaults so the app boots without them.

2. Create empty scaffold files: apps/api/app/services/__init__.py, and empty schema stubs for auth, history, gmail, feedback, preferences, insights under apps/api/app/schemas/.

3. Create apps/api/tests/test_v1_regression.py with comprehensive V1 regression tests covering health, models, classify endpoints with exact response shape validation. Follow existing test patterns in conftest.py.

4. Create apps/web/__tests__/V1Regression.test.tsx to verify landing page renders, ClassifyForm renders, Header renders.

5. Run all tests to confirm V1 still works. Do not modify any existing V1 files beyond config.py (additive only).
```

### Phase 1

```
Read CLAUDE.md. Implement Phase 1 of Tasks_V2_Improved.md:

1. Add all V2 SQLAlchemy models to apps/api/app/db/models.py BELOW the existing ClassificationLog and ModelVersionLog. Keep the existing Base class. Models: User, UserSession, OAuthAccount, GmailConnection, ClassificationEvent, FeedbackEvent, SenderOverride, DomainOverride, UserPreferences, PersonalizationProfile. Use UUID primary keys matching existing pattern, DateTime(timezone=True), proper ForeignKeys, unique constraints, and indexes.

2. Create Alembic migration apps/api/alembic/versions/0002_v2_tables.py with revision "0002" and down_revision "0001". Create all new tables. Do NOT modify existing tables.

3. Run V1 regression tests to confirm nothing broke.

Critical: Do NOT modify classification_log or model_version_log tables.
```

### Phase 2

```
Read CLAUDE.md. Implement Phase 2 of Tasks_V2_Improved.md (Auth Backend):

1. Create apps/api/app/schemas/auth.py with GoogleAuthStartResponse, UserResponse, UserPreferencesResponse, LogoutResponse.

2. Create apps/api/app/services/auth_service.py with exchange_google_code() and find_or_create_user(). Use httpx async for Google API calls (token endpoint + userinfo).

3. Create apps/api/app/services/session_service.py with create_session(), validate_session(), revoke_session(). Use secrets.token_urlsafe(48), sha256 for storage.

4. Create apps/api/app/api/deps.py with get_current_user() and get_optional_user() dependencies. Read from "spamshield_session" cookie OR "Authorization: Bearer" header.

5. Create apps/api/app/api/v1/auth.py with GET /auth/google/start, GET /auth/google/callback, POST /auth/logout, GET /me. Register in __init__.py.

6. Add httpx>=0.27.0 and cryptography>=42.0.0 to requirements/base.txt.

7. Create apps/api/tests/test_auth.py with comprehensive tests including V1 regression.

Non-negotiable: POST /api/v1/classify must still work without auth.
```

### Phase 3

```
Read CLAUDE.md. Implement Phase 3 of Tasks_V2_Improved.md (Auth Frontend):

1. Create apps/web/lib/api/auth.ts with startGoogleAuth(), getCurrentUser(), logout(). Use credentials:"include".

2. Create apps/web/contexts/AuthContext.tsx providing user, isLoading, isAuthenticated, login(), logout(), refreshUser().

3. Create apps/web/hooks/useAuth.ts as useContext wrapper.

4. Modify apps/web/app/layout.tsx to wrap children with AuthProvider. Keep all existing layout intact.

5. Modify apps/web/components/layout/Header.tsx to conditionally show Sign In / user info. Keep all existing nav links and Try Demo CTA.

6. Create apps/web/app/app/layout.tsx (workspace shell) and apps/web/app/app/page.tsx (workspace home).

7. Create apps/web/app/auth/callback/page.tsx for OAuth callback handling.

8. Create apps/web/middleware.ts protecting /app/* routes only.

9. Verify: landing page renders identically when logged out.
```

### Phase 4

```
Read CLAUDE.md. Implement Phase 4 of Tasks_V2_Improved.md (History Backend):

1. Create apps/api/app/schemas/history.py with HistoryItemResponse, HistoryDetailResponse, HistoryListResponse, ClearHistoryResponse.

2. Create apps/api/app/services/history_service.py with create_event(), list_events() (cursor pagination), get_event(), delete_event(), clear_events(). All user-scoped. Subject truncated to 256 chars.

3. Create apps/api/app/services/classification_service.py wrapping predict() + optional history write. If user is None, behave identically to V1.

4. Modify apps/api/app/api/v1/classify.py minimally: add get_optional_user dependency. Response shape MUST NOT change.

5. Create apps/api/app/api/v1/history.py with all history CRUD routes. Register in __init__.py.

6. Create apps/api/tests/test_history.py testing user isolation, pagination, and V1 regression.

Non-negotiable: POST /api/v1/classify response must be IDENTICAL with or without auth.
```

### Phase 5

```
Read CLAUDE.md. Implement Phase 5 of Tasks_V2_Improved.md (Feedback + Rules + Preferences Backend):

1. Create schemas: apps/api/app/schemas/feedback.py and apps/api/app/schemas/preferences.py.

2. Create apps/api/app/services/feedback_service.py with submit_feedback(), delete_feedback(), get_feedback_for_event(), suggest_rule().

3. Create apps/api/app/services/rules_service.py with get_rules(), add_sender_rule(), add_domain_rule(), delete_rule(), check_sender(), check_domain().

4. Create apps/api/app/services/preferences_service.py with get_or_create_preferences(), update_preferences().

5. Create route files: apps/api/app/api/v1/feedback.py and apps/api/app/api/v1/preferences.py. Register in __init__.py.

6. Create tests with user isolation verification. Run V1 regression.
```

### Phase 6

```
Read CLAUDE.md. Implement Phase 6 of Tasks_V2_Improved.md (Gmail Backend):

1. Create apps/api/app/schemas/gmail.py with all Gmail request/response models.

2. Create apps/api/app/services/gmail_oauth_service.py. Use cryptography.fernet for token encryption with key from SESSION_SECRET_KEY. Handle connect URL, code exchange, token refresh, disconnect with revocation.

3. Create apps/api/app/services/gmail_client.py wrapping Gmail API via httpx. list_messages() and get_message().

4. Create apps/api/app/services/gmail_message_mapper.py to extract subject/body/sender from Gmail API format. Handle multipart, HTML stripping.

5. Create apps/api/app/api/v1/gmail.py with all routes. Register in __init__.py. All require auth.

6. Create apps/api/tests/test_gmail.py with mocked Gmail API. Verify app boots without Gmail credentials.

Critical: App must boot and V1 must work even if GMAIL_CLIENT_ID is not set.
```

### Phase 7

```
Read CLAUDE.md. Implement Phase 7 of Tasks_V2_Improved.md (Frontend Workspace Shell):

1. Build apps/web/app/app/layout.tsx as workspace shell with sidebar navigation (History, Gmail, Settings, Insights). User info in sidebar header. "Back to Home" link. Responsive sidebar. Use existing Tailwind design tokens.

2. Build apps/web/app/app/page.tsx as workspace home with quick-access cards.

3. Verify / page is completely unchanged. Verify /app redirects when not authenticated.
```

### Phase 8

```
Read CLAUDE.md. Implement Phase 8 of Tasks_V2_Improved.md (History Frontend):

1. Create apps/web/lib/api/history.ts with API client functions.

2. Create apps/web/hooks/useHistory.ts: server history when authenticated, localStorage when not. Do NOT modify useClassifyHistory.ts.

3. Create apps/web/app/app/history/page.tsx with paginated, filterable history list.

4. Verify anonymous localStorage history is completely unaffected.
```

### Phase 9

```
Read CLAUDE.md. Implement Phase 9 of Tasks_V2_Improved.md (Settings + Feedback Frontend):

1. Create apps/web/lib/api/feedback.ts and apps/web/lib/api/preferences.ts.

2. Create apps/web/components/classify/FeedbackControls.tsx (authenticated only).

3. Create apps/web/components/classify/QuickRuleActions.tsx.

4. Create apps/web/app/app/settings/page.tsx with sensitivity, personalization toggle, rules CRUD, privacy controls.

5. Verify VerdictCard renders identically for anonymous users.
```

### Phase 10

```
Read CLAUDE.md. Implement Phase 10 of Tasks_V2_Improved.md (Gmail Frontend):

1. Create apps/web/lib/api/gmail.ts and apps/web/hooks/useGmail.ts.

2. Create apps/web/app/app/gmail/page.tsx with connect/disconnect and message listing.

3. Create Gmail components under apps/web/components/gmail/.

4. Verify landing page and manual classify are unaffected.
```

### Phase 11

```
Read CLAUDE.md and RULES_V2.md. Implement Phase 11 of Tasks_V2_Improved.md (Personalization Backend):

1. Create apps/api/app/services/personalization_service.py with personalize() implementing: load preferences, check sender/domain overrides, apply feedback score_adjustment, apply sensitivity threshold (relaxed=0.65, balanced=0.50, strict=0.35), determine review_state, compile reasons.

2. Add update_personalization_profile() to feedback_service.py. Derive score_adjustment from false_positive/false_negative counts, clamped to [-0.15, +0.15].

3. Modify classification_service.py to call personalize() for authenticated users.

4. Extend ClassifyResponse in schemas/classify.py with Optional personalized, review_state, personalization_reasons (None default).

5. Create apps/api/tests/test_personalization.py.

CRITICAL: Anonymous POST /api/v1/classify must return identical response. Run V1 regression.
```

### Phase 12

```
Read CLAUDE.md. Implement Phase 12 of Tasks_V2_Improved.md (Personalization Frontend):

1. Extend apps/web/components/classify/VerdictCard.tsx for personalization display. When personalized is null/false, render IDENTICALLY to V1.

2. Update packages/types/index.ts and apps/web/lib/api/classify.ts with optional personalization fields.

3. Verify VerdictCard renders correctly for both anonymous and authenticated cases.
```

### Phase 13

```
Read CLAUDE.md. Implement Phase 13 of Tasks_V2_Improved.md (Insights):

1. Create apps/api/app/services/insights_service.py with get_summary().

2. Create apps/api/app/schemas/insights.py and apps/api/app/api/v1/insights.py. Register route.

3. Create apps/web/app/app/insights/page.tsx with stats cards and charts using recharts.

4. Verify V1 regression.
```

### Phase 14

```
Read CLAUDE.md. Implement Phase 14 of Tasks_V2_Improved.md (Privacy Controls):

1. Create apps/api/app/services/privacy_service.py with disconnect_gmail(), clear_history(), reset_personalization(), delete_account().

2. Add POST /api/v1/account/delete route.

3. Verify settings page privacy controls work end-to-end.

4. Create apps/api/tests/test_privacy.py testing cascade deletion.
```

### Phase 15

```
Read CLAUDE.md. Implement Phase 15 of Tasks_V2_Improved.md (Contract Consolidation):

1. Audit all TypeScript interfaces vs packages/types/index.ts. Identify drift.

2. Add all V2 types to packages/types/index.ts.

3. Update frontend imports to use shared types.

4. Verify build passes: pnpm build in apps/web.
```

### Phase 16

```
Read CLAUDE.md, TESTS_V2.md. Implement Phase 16 of Tasks_V2_Improved.md (Final Hardening):

1. Create apps/api/tests/test_integration.py with end-to-end scenarios.

2. Create apps/web/__tests__/V2Components.test.tsx.

3. Run complete V1 regression suite.

4. Verify app boots in all four states: no-DB, auth-no-Gmail, auth-with-Gmail, full-personalization.

5. All tests must pass. This is the release gate.
```
