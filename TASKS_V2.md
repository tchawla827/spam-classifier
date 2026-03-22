# TASKS_V2.md

## Phase 0 - V2 foundation and regression guardrails
- [ ] Create a V2 branch or equivalent safe working baseline.
- [ ] Tag or otherwise preserve the current V1-stable state before major V2 work.
- [ ] Audit current shared types vs duplicated frontend API types.
- [ ] Introduce feature/config scaffolding for V2 env variables.
- [ ] Add placeholders for auth, Gmail, history, feedback, and personalization modules.
- [ ] Add regression checks for current V1 routes and homepage render.
- [ ] **Validation checkpoint:** V1 manual classification still works exactly as before.

---

## Phase 1 - Accounts and sessions
- [ ] Add DB models for `users` and `user_sessions`.
- [ ] Add Google sign-in / auth account linkage model(s).
- [ ] Add auth/session schemas.
- [ ] Implement auth service and session service.
- [ ] Implement `GET /api/v1/auth/google/start`.
- [ ] Implement `GET /api/v1/auth/google/callback`.
- [ ] Implement `POST /api/v1/auth/logout`.
- [ ] Implement `GET /api/v1/me`.
- [ ] Add frontend auth state management.
- [ ] Add sign-in / sign-out UI entry points.
- [ ] **Validation checkpoint:** user can sign in and session survives refresh.

---

## Phase 2 - Per-user history
- [ ] Add DB model(s) for account-scoped classification history.
- [ ] Decide migration path from current generic `classification_log` to user-aware history/event model.
- [ ] Implement history repository/service.
- [ ] Implement `GET /api/v1/history`.
- [ ] Implement `GET /api/v1/history/{history_id}`.
- [ ] Implement delete/clear history endpoints.
- [ ] Add authenticated history sidebar in frontend.
- [ ] Keep anonymous local history as fallback for logged-out users.
- [ ] Add search/filter/pagination basics for server history.
- [ ] **Validation checkpoint:** authenticated user sees only their own history.

---

## Phase 3 - Gmail connection and read-only inbox ingestion
- [ ] Add DB model(s) for Gmail connection metadata and encrypted token storage.
- [ ] Add Gmail OAuth service and client.
- [ ] Implement Gmail connect/disconnect endpoints.
- [ ] Implement Gmail connection status endpoint.
- [ ] Implement recent message listing endpoint.
- [ ] Implement Gmail-to-classify-input mapper (subject/body normalization).
- [ ] Implement single-message Gmail classify endpoint.
- [ ] Implement batch Gmail classify endpoint.
- [ ] Add frontend Gmail inbox page/list UI.
- [ ] Add classify-selected-email UX.
- [ ] **Validation checkpoint:** connected user can classify selected Gmail messages without breaking manual classify.

---

## Phase 4 - Feedback capture
- [ ] Add DB model(s) for feedback events.
- [ ] Define feedback labels and optional reasons.
- [ ] Implement `POST /api/v1/feedback`.
- [ ] Implement delete/update feedback flow.
- [ ] Add feedback controls to result views (manual + Gmail where applicable).
- [ ] Surface whether a classification already has feedback from the user.
- [ ] **Validation checkpoint:** feedback persists and is tied to the correct user and history item.

---

## Phase 5 - Rules and preferences
- [ ] Add DB model(s) for sender overrides.
- [ ] Add DB model(s) for domain overrides.
- [ ] Add DB model(s) for user preferences.
- [ ] Implement preferences endpoints.
- [ ] Implement sender/domain rule CRUD endpoints.
- [ ] Add sensitivity settings (`relaxed`, `balanced`, `strict`).
- [ ] Add frontend settings screen for preferences and rules.
- [ ] Add quick actions like “Always trust sender” or “Block domain” from classification result UI.
- [ ] **Validation checkpoint:** rules affect future classifications predictably and are user-scoped.

---

## Phase 6 - Personalization layer
- [ ] Create personalization service that consumes:
  - [ ] global model output
  - [ ] user preferences
  - [ ] sender/domain rules
  - [ ] feedback-derived profile data
- [ ] Implement hard overrides first.
- [ ] Implement user threshold/sensitivity adjustments.
- [ ] Implement lightweight feedback-informed score adjustment.
- [ ] Add `review` / `needs_review` decision state.
- [ ] Add personalization explanation metadata to authenticated flows.
- [ ] Ensure anonymous/manual V1 path remains backward compatible.
- [ ] **Validation checkpoint:** identical input can produce different outcomes for different users only when justified by settings/rules/profile.

---

## Phase 7 - Insights and smart suggestions
- [ ] Add service for user summary analytics.
- [ ] Implement `GET /api/v1/insights/summary`.
- [ ] Add dashboard page with key stats.
- [ ] Add false-positive/false-negative summaries.
- [ ] Add rule suggestion logic based on repeated feedback patterns.
- [ ] Surface suggestions in UI, but require explicit user confirmation.
- [ ] **Validation checkpoint:** dashboard reflects real history/feedback data accurately.

---

## Phase 8 - Privacy and data controls
- [ ] Add Gmail disconnect flow with token cleanup/revocation where possible.
- [ ] Add clear history flow.
- [ ] Add personalization reset flow.
- [ ] Add account deletion flow.
- [ ] Add privacy UI copy/settings screen updates.
- [ ] Add backend safeguards for minimal retention defaults.
- [ ] **Validation checkpoint:** user can disconnect Gmail and reset stored personalization data safely.

---

## Phase 9 - Contract consolidation and developer cleanup
- [ ] Consolidate frontend/backend contract types to reduce drift.
- [ ] Refactor duplicated API shapes where needed.
- [ ] Ensure new routes are versioned consistently under `/api/v1`.
- [ ] Review env/config handling for local/dev/prod clarity.
- [ ] Update root README and docs for V2.
- [ ] **Validation checkpoint:** API contracts match implementation and shared types.

---

## Phase 10 - Test and hardening pass
- [ ] Add backend tests for auth/session routes.
- [ ] Add backend tests for history isolation by user.
- [ ] Add backend tests for Gmail status/list/classify flows with mocks.
- [ ] Add backend tests for feedback/rules/preferences.
- [ ] Add backend tests for personalization service.
- [ ] Add frontend tests for auth-aware UI states.
- [ ] Add frontend tests for history sidebar and settings screen.
- [ ] Add V1 regression tests for manual classify flow.
- [ ] Run build/lint/test for the monorepo.
- [ ] **Validation checkpoint:** V1 and V2 flows pass together.

---

## Deferred / optional after initial V2
- [ ] Gmail write-back actions (apply label/archive/move)
- [ ] advanced keyword-level user rules
- [ ] richer dashboard charts
- [ ] multi-provider inbox support
- [ ] advanced online learning or retraining workflows
