# RULES_V2.md

These are the hard implementation rules for V2.

## Rule 1: Do not break V1
The current shipped V1 behavior is a protected baseline.

Protected flows:
- homepage render
- hero interaction
- manual classify form
- current classify API
- current model loading path
- anonymous local history

---

## Rule 2: Prefer additive changes
Add:
- routes
- services
- schemas
- tables
- components

Avoid:
- replacing stable V1 modules unless absolutely necessary
- large rewrites without compatibility coverage

---

## Rule 3: Keep Gmail optional
The product must still be usable without Gmail.

Manual classification remains a first-class workflow.

---

## Rule 4: Keep auth from polluting the public landing page
The current landing page is still important.
Add authenticated workspace features cleanly without turning `/` into a cluttered dashboard.

---

## Rule 5: Personalization is layered, not a replacement model
Correct order:
1. global model
2. user rules
3. user threshold
4. feedback-based adjustment
5. final decision

Do not retrain the main model per user in initial V2.

---

## Rule 6: Rules beat heuristics
Explicit user rules such as:
- trust sender
- trust domain
- block sender
- block domain

should override soft personalization where product logic says they should.

---

## Rule 7: Explain the final decision
For personalized flows, expose the reason source:
- global model
- sender/domain override
- sensitivity threshold
- feedback adjustment

---

## Rule 8: Privacy-safe defaults only
Do not persist full raw email content indefinitely by default.
Use minimal retention wherever possible.

---

## Rule 9: Shared contracts over drift
Avoid duplicated shapes between:
- backend Pydantic schemas
- frontend local interfaces
- shared type packages

Where practical, centralize.

---

## Rule 10: Migrations are required for DB changes
No ad hoc schema drift.
Every DB model change must be backed by an Alembic migration.

---

## Rule 11: Keep services modular
Avoid giant route handlers.
Prefer dedicated service modules for:
- auth
- Gmail
- history
- feedback
- personalization
- insights

---

## Rule 12: Fail safely
If Gmail fails:
- manual classify still works

If DB fails in an optional path:
- app degrades safely where possible

If personalization fails:
- fall back to global model output rather than hard-failing classification

---

## Rule 13: Anonymous and authenticated history must coexist cleanly
Logged-out users:
- local history only

Logged-in users:
- server history as source of truth
- local fallback should not corrupt account history

---

## Rule 14: Test user isolation carefully
No user should ever see another user's:
- history
- feedback
- rules
- Gmail state
- dashboard data

---

## Rule 15: Keep V2 understandable
Every feature added should be explainable in product terms.
Avoid “magic” behavior that users cannot understand or control.
