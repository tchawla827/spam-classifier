# V2 Execution Guide

This document tells Claude Code exactly how to work through V2 **without breaking the shipped V1**.

## Mission

Extend the existing `spam-classifier` monorepo from an anonymous demo into an authenticated, Gmail-connected, user-personalized spam assistant.

V2 must add:
- user accounts and sessions
- per-user persisted history
- Gmail connection and email ingestion
- per-email user feedback
- rule-based personalization
- lightweight user personalization on top of the current global ensemble
- privacy-safe user controls and history management

V2 must **not** break:
- landing page and interactive hero
- anonymous manual classification flow
- existing API routes:
  - `GET /api/v1/health`
  - `POST /api/v1/classify`
  - `GET /api/v1/models`
- current ML artifact loading and inference path
- current optional database behavior for local/dev operation

---

## Required read order

Claude Code must read these files in this order before making code changes:

1. `CLAUDE.md`
2. `PRIMER.md`
3. `RULES_V2.md`
4. `PRD_V2.md`
5. `ARCHITECTURE_V2.md`
6. `STRUCTURE_V2.md`
7. `API_CONTRACTS_V2.md`
8. `DATASET_V2.md`
9. `SECURITY_PRIVACY_V2.md`
10. `TESTS_V2.md`
11. `TASKS_V2.md`

---

## Execution strategy

### Phase style
Work phase-by-phase. Finish one phase fully before starting the next.

For every phase:
1. restate the phase goal
2. identify impacted files
3. describe how V1 compatibility will be preserved
4. implement code
5. run the exact validations listed in `TESTS_V2.md`
6. summarize what changed and what remains

### Change style
Prefer **additive** changes over risky rewrites.

Examples:
- add authenticated history endpoints without removing anonymous local history
- add Gmail routes/modules without forcing Gmail for the manual classifier
- add personalization as a post-model adjustment layer, not a rewrite of the global ML pipeline
- add new DB tables without breaking existing classification logging

### Rollout style
Use capability gates where appropriate:
- unauthenticated: V1 manual classify still works
- authenticated without Gmail: account, per-user history, settings, feedback on manual classifications
- authenticated with Gmail: Gmail inbox classification and feedback
- optional advanced features: suggested rules, dashboard, Gmail write-back

---

## Strong constraints

- Do not rename or remove existing V1 routes unless there is an explicit migration path.
- Do not break current frontend rendering for `/`.
- Do not make Gmail auth mandatory for the app to be usable.
- Do not couple personalization to retraining the full ensemble.
- Do not store raw email bodies forever by default.
- Do not introduce hard dependencies that prevent the app from booting locally without Gmail credentials.
- Keep database optional where practical, but authenticated features may require DB-backed mode.

---

## Recommended build order

### Phase 0
Stabilization and scaffolding for V2:
- shared auth/session foundation
- feature flags/config
- DB model expansion
- preserve V1 behavior

### Phase 1
Accounts and sessions:
- user table
- session mechanism
- Google sign-in
- account-aware frontend shell

### Phase 2
Per-user persisted history:
- server-backed history
- sidebar/history UX
- anonymous fallback retained

### Phase 3
Gmail read integration:
- connect/disconnect Gmail
- fetch recent messages
- classify selected Gmail emails
- safe metadata caching only

### Phase 4
Feedback and overrides:
- feedback per classification
- sender/domain trust/block rules
- sensitivity settings

### Phase 5
Personalization layer:
- post-ensemble adjustment service
- explain global vs personalized decision
- review band / uncertain queue

### Phase 6
Insights and dashboard:
- user stats
- false positive/negative summaries
- smart rule suggestions

### Phase 7
Hardening:
- test suite
- migrations
- fallback behavior
- docs cleanup

---

## Suggested Claude Code session prompt

Use this prompt at the start of a session:

> Read `CLAUDE.md`, `PRIMER.md`, `docs/v2/RULES_V2.md`, `docs/v2/ARCHITECTURE_V2.md`, `docs/v2/API_CONTRACTS_V2.md`, `docs/v2/STRUCTURE_V2.md`, `docs/v2/TESTS_V2.md`, and `docs/v2/TASKS_V2.md`. We are implementing V2 for the existing `spam-classifier` repo. Preserve all working V1 behavior, especially the anonymous manual classify flow and current public API routes. Work phase-by-phase, make additive changes, explain impacted files before edits, and validate each phase before moving on.

---

## Deliverable expectations

At the end of each phase, Claude Code should provide:
- modified file list
- migrations added
- new environment variables
- API contracts implemented
- V1 regression status
- outstanding risks

At the end of V2, the repo should support:
- manual classify for anonymous users
- signed-in accounts
- per-user history
- Gmail connection
- feedback capture
- personalization rules + light ML adjustment
- privacy-safe controls
