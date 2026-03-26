# STRUCTURE_V2.md

This document proposes the V2 repo structure while preserving the existing V1 organization.

## Current top-level shape to preserve

```text
spam-classifier/
├── apps/
│   ├── web/
│   └── api/
├── packages/
├── ml/
└── docs/planning files
```

V2 should remain within this monorepo.

---

## Recommended V2 structure additions

```text
spam-classifier/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── page.tsx                   # keep existing landing page
│   │   │   ├── app/                       # signed-in workspace shell
│   │   │   │   ├── page.tsx
│   │   │   │   ├── history/page.tsx
│   │   │   │   ├── gmail/page.tsx
│   │   │   │   ├── settings/page.tsx
│   │   │   │   └── insights/page.tsx
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── gmail/
│   │   │   ├── history/
│   │   │   ├── settings/
│   │   │   ├── insights/
│   │   │   └── classify/                  # preserve and extend
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useHistory.ts
│   │   │   ├── useGmail.ts
│   │   │   └── usePreferences.ts
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── history.ts
│   │   │   │   ├── gmail.ts
│   │   │   │   ├── feedback.ts
│   │   │   │   └── preferences.ts
│   │   │   └── auth/
│   │   └── middleware.ts                  # optional auth-aware route protection
│   │
│   └── api/
│       ├── app/
│       │   ├── api/v1/
│       │   │   ├── health.py              # preserve
│       │   │   ├── classify.py            # preserve/extend carefully
│       │   │   ├── auth.py                # new
│       │   │   ├── gmail.py               # new
│       │   │   ├── history.py             # new
│       │   │   ├── feedback.py            # new
│       │   │   ├── preferences.py         # new
│       │   │   └── insights.py            # new
│       │   ├── db/
│       │   │   ├── models.py              # extend existing or split by domain
│       │   │   ├── session.py             # preserve
│       │   │   └── repositories/
│       │   ├── schemas/
│       │   │   ├── classify.py            # preserve
│       │   │   ├── auth.py
│       │   │   ├── gmail.py
│       │   │   ├── history.py
│       │   │   ├── feedback.py
│       │   │   ├── preferences.py
│       │   │   └── insights.py
│       │   ├── services/
│       │   │   ├── classification_service.py
│       │   │   ├── auth_service.py
│       │   │   ├── session_service.py
│       │   │   ├── gmail_oauth_service.py
│       │   │   ├── gmail_client.py
│       │   │   ├── gmail_message_mapper.py
│       │   │   ├── history_service.py
│       │   │   ├── feedback_service.py
│       │   │   ├── rules_service.py
│       │   │   ├── personalization_service.py
│       │   │   └── insights_service.py
│       │   └── core/
│       │       └── config.py              # extend env settings
│       │
│       └── alembic/
│           └── versions/                  # add V2 migrations
│
├── packages/
│   ├── types/
│   │   └── index.ts                       # extend shared contracts
│   └── config/
│
├── ml/
│   ├── src/
│   │   ├── inference/
│   │   │   └── predict.py                 # keep global inference stable
│   │   └── personalization/
│   │       ├── scoring.py                 # optional new layer
│   │       └── profiles.py
│   └── artifacts/
│
└── docs/
    └── v2/                                # optional home for these planning docs
```

---

## Structural rules

### Rule 1
Do not collapse V1 and V2 logic into giant route files.

### Rule 2
Keep business logic in services, not directly in API routes.

### Rule 3
If `apps/api/app/db/models.py` becomes too large, split into:
- `models/user.py`
- `models/history.py`
- `models/personalization.py`

### Rule 4
Frontend authenticated workspace should be distinct from the public landing page.

### Rule 5
Move toward shared types rather than duplicating API contracts in multiple places.

---

## Concrete preservation notes

### Preserve
- `apps/web/app/page.tsx`
- existing landing sections
- existing classify card UX
- `apps/api/app/main.py`
- `apps/api/app/api/v1/classify.py`
- `ml/src/inference/predict.py`

### Extend carefully
- `apps/api/app/core/config.py`
- `apps/api/app/db/models.py`
- `packages/types/index.ts`
- frontend classify components so they can support authenticated/server history without breaking anonymous mode

---

## Route strategy recommendation

### Public routes
- `/`
- auth callback helpers if needed

### Authenticated workspace routes
- `/app`
- `/app/history`
- `/app/gmail`
- `/app/settings`
- `/app/insights`

This keeps marketing/demo and actual workspace concerns separated cleanly.

---

## Data ownership strategy

### Frontend local-only state
- anonymous history fallback
- UI-only transient selections

### Backend/Postgres state
- users
- sessions
- Gmail connection info
- history
- feedback
- rules
- preferences
- insights aggregates

### ML/global artifacts
- unchanged, versioned bundle

### Personalization artifacts
- compact per-user profile data
- not a replacement for the global bundle
