# Development Setup

## Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.11+
- PostgreSQL (optional — persistence and auth features require it)

---

## 1. Clone and install

```bash
git clone <repo>
cd spam-classifier
pnpm install
```

---

## 2. ML artifact bundle

The API requires a pre-built model bundle at `ml/artifacts/bundle/`. If you have the bundle archive:

```bash
tar -xzf ml-bundle.tar.gz -C ml/artifacts/
```

To train a fresh bundle from scratch, see [ML.md](./ML.md).

---

## 3. Backend setup

```bash
cd apps/api
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements/base.txt
pip install -r requirements/dev.txt   # for tests
```

### Environment variables

Copy the example and fill in the values you need:

```bash
cp .env.example .env
```

Minimum for anonymous classification (no auth, no DB):

```env
ARTIFACT_BUNDLE_DIR=ml/artifacts/bundle
CORS_ORIGINS=http://localhost:3000
```

To enable authentication and persistence, also set:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/spamshield
SESSION_SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

To enable Gmail scanning:

```env
GMAIL_CLIENT_ID=<from Google Cloud Console>
GMAIL_CLIENT_SECRET=<from Google Cloud Console>
GMAIL_REDIRECT_URI=http://localhost:8000/api/v1/gmail/connect/callback
```

### Database migrations

If `DATABASE_URL` is set:

```bash
cd apps/api
alembic upgrade head
```

### Start the API

```bash
cd apps/api
uvicorn app.main:app --reload
```

API is available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

---

## 4. Frontend setup

```bash
cd apps/web
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
pnpm dev
```

Frontend is available at `http://localhost:3000`.

---

## 5. Running both together

From the repo root:

```bash
pnpm dev
```

This runs the Next.js dev server via Turborepo. The API must be started separately.

---

## 6. Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs:
   - `http://localhost:8000/api/v1/auth/google/callback`
   - `http://localhost:8000/api/v1/gmail/connect/callback`
4. Copy the client ID and secret into your `.env`
5. Enable the **Gmail API** if you want Gmail scanning

For local development, Google requires the app to be in testing mode and your account to be added as a test user.

---

## 7. Running tests

### Frontend

```bash
pnpm --filter web test
```

### Backend

```bash
cd apps/api
pytest
```

### ML

```bash
cd ml
pytest
```

---

## 8. Monorepo commands

Run from the repo root:

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format all packages |
| `pnpm --filter web test` | Frontend tests |

---

## Common issues

**API returns 503 on `/classify`**
The ML bundle didn't load. Check that `ARTIFACT_BUNDLE_DIR` points to a valid bundle directory containing `model_metadata.json` and the `.joblib` files.

**`RuntimeError: SESSION_SECRET_KEY is still set to the insecure default`**
You have `GOOGLE_CLIENT_ID` or `GMAIL_CLIENT_ID` set but haven't changed `SESSION_SECRET_KEY`. Generate a strong key and add it to `.env`.

**Google OAuth returns redirect_uri_mismatch**
The `GOOGLE_REDIRECT_URI` in your `.env` must exactly match an authorized redirect URI in your Google Cloud Console project.

**Database connection refused**
Make sure PostgreSQL is running and `DATABASE_URL` uses the `postgresql+asyncpg://` scheme (async driver required).
