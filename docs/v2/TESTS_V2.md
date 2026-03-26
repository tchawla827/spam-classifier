# TESTS_V2.md

This file defines the minimum validation and regression strategy for V2.

## Testing principle

V2 is only acceptable if:
1. new features work
2. V1 still works

---

## Mandatory V1 regression coverage

## Backend
- `GET /api/v1/health` still returns success
- `GET /api/v1/models` still returns valid model info
- `POST /api/v1/classify` still accepts manual subject/body input
- existing response shape for manual classify remains compatible

## Frontend
- `/` still renders
- hero scene still loads
- manual classify form still submits
- verdict card still renders
- anonymous local history still works when logged out

---

## New V2 backend test areas

## Auth/session
- Google auth start route returns valid redirect info
- callback creates or resolves a user correctly
- invalid state is rejected
- logout clears session
- `/api/v1/me` requires/uses valid session correctly

## History
- authenticated users only see their own history
- one user cannot fetch/delete another user's history
- clear-history affects only current user
- anonymous path does not rely on server history

## Gmail
- Gmail status reflects connected/disconnected state
- Gmail listing route handles pagination
- Gmail fetch/classify handles missing connection safely
- Gmail classify maps subject/body correctly
- Gmail API errors degrade gracefully

## Feedback
- feedback attaches to correct history item and user
- invalid feedback labels are rejected
- deleting feedback works
- repeated feedback updates are handled safely

## Rules/preferences
- trust sender override works
- block sender override works
- trust domain override works
- block domain override works
- sensitivity setting changes threshold behavior
- user A rules never affect user B

## Personalization layer
- no rules + no feedback -> output equals global baseline logic
- hard override changes result deterministically
- threshold-only change is explainable
- feedback adjustment changes score only within allowed bounds
- review state triggers in expected uncertainty windows

---

## Frontend V2 test areas

## Auth UX
- signed-out state renders sign-in affordance
- signed-in state shows workspace entry/user state
- logout returns UI to signed-out mode

## History UX
- history sidebar loads account data
- selecting a history item restores/shows correct result
- empty history state renders correctly
- filtering/search updates list correctly

## Gmail UX
- disconnected state renders connect CTA
- connected state renders messages
- message selection/classification flow renders result
- Gmail errors show safe non-breaking UI

## Feedback UX
- feedback controls submit correctly
- feedback state updates after submit
- quick rule action buttons work

## Settings UX
- user can change sensitivity
- user can add/remove rules
- user can disconnect Gmail
- user can reset personalization

---

## Integration / end-to-end scenarios

### Scenario 1: V1 anonymous user
- visit homepage
- manually classify
- see result
- local history updates

### Scenario 2: authenticated manual user
- sign in
- classify manual email
- server history updates
- same account sees history after refresh

### Scenario 3: Gmail user
- sign in
- connect Gmail
- view inbox list
- classify a selected message
- save feedback
- add trust/block rule

### Scenario 4: personalization
- user marks sender as trusted
- future email from same sender becomes safe or review-lowered as designed
- explanation shows override reason

---

## Mocking guidance

Use mocks/fakes for:
- Gmail API calls
- OAuth callback exchange
- token refresh
- external failure cases

Do not depend on live Gmail for automated CI tests.

---

## Performance sanity checks

- homepage render should not regress badly
- manual classify latency should remain reasonable
- history sidebar should paginate rather than load everything
- batch Gmail classify should have safe limits

---

## Release gate

Do not call V2 ready unless:
- V1 regression suite passes
- auth/history tests pass
- Gmail flows pass with mocks
- personalization service tests pass
- critical privacy controls are tested
