# Deployment

---

## Docker

The API has a Dockerfile at `apps/api/Dockerfile`. The root `Dockerfile` is for the full monorepo build.

### Build the API image

```bash
docker build -f apps/api/Dockerfile -t spamshield-api .
```

The Dockerfile uses the repo root as the build context so the `ml/` package is available.

### Run locally

```bash
docker run -p 8000:8000 \
  -e ARTIFACT_BUNDLE_DIR=ml/artifacts/bundle \
  -e CORS_ORIGINS=http://localhost:3000 \
  -e DATABASE_URL=postgresql+asyncpg://user:pass@host/db \
  -e SESSION_SECRET_KEY=<strong_secret> \
  -e GOOGLE_CLIENT_ID=<client_id> \
  -e GOOGLE_CLIENT_SECRET=<client_secret> \
  spamshield-api
```

---

## Render

The project includes a `render.yaml` for the API service. The API is deployed as a Docker service.

### Steps

1. Create a new Web Service in Render, connect the repo
2. Render picks up `render.yaml` automatically
3. Set the following environment variables in the Render dashboard (not in `render.yaml`):
   - `DATABASE_URL`
   - `SESSION_SECRET_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   - `CORS_ORIGINS` — comma-separated list of your frontend origins
4. Add a PostgreSQL database in Render and link its internal URL as `DATABASE_URL`
5. Run the first migration after deploy:
   ```bash
   # In Render Shell or via a one-off job
   alembic upgrade head
   ```

### Redirect URIs

Update your Google OAuth credentials to include the production redirect URIs:
- `https://your-api.onrender.com/api/v1/auth/google/callback`
- `https://your-api.onrender.com/api/v1/gmail/connect/callback`

And update the API environment variables:
- `GOOGLE_REDIRECT_URI=https://your-api.onrender.com/api/v1/auth/google/callback`
- `GMAIL_REDIRECT_URI=https://your-api.onrender.com/api/v1/gmail/connect/callback`
- `FRONTEND_URL=https://your-frontend.vercel.app`

### Frontend (Vercel / static hosting)

The Next.js app can be deployed to Vercel or any Node.js host:

```bash
pnpm --filter web build
```

Set the environment variable:
```env
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
```

---

## Environment variables reference

### Required for basic operation

| Variable | Default | Description |
|----------|---------|-------------|
| `ARTIFACT_BUNDLE_DIR` | `ml/artifacts/bundle` | Path to the ML bundle directory |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed frontend origins |

### Required for auth and persistence

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | `postgresql+asyncpg://...` connection string |
| `SESSION_SECRET_KEY` | `change-me-in-production` | Must be changed when OAuth is enabled |
| `GOOGLE_CLIENT_ID` | — | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8000/api/v1/auth/google/callback` | Must match Google Console |

### Required for Gmail scanning

| Variable | Default | Description |
|----------|---------|-------------|
| `GMAIL_CLIENT_ID` | — | Can be the same OAuth app as Google auth |
| `GMAIL_CLIENT_SECRET` | — | |
| `GMAIL_REDIRECT_URI` | `http://localhost:8000/api/v1/gmail/connect/callback` | Must match Google Console |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_URL` | `http://localhost:3000` | Used for OAuth callback redirects |
| `SESSION_EXPIRY_HOURS` | `168` | Session lifetime in hours (7 days) |
| `SESSION_COOKIE_SAMESITE` | `lax` | `lax`, `strict`, or `none` |
| `SESSION_COOKIE_DOMAIN` | — | Set for cross-subdomain cookies |
| `PERSONALIZATION_ENABLED` | `true` | Feature flag for the personalization layer |
| `GMAIL_ENABLED` | `true` | Feature flag for Gmail features |
| `ANON_CLASSIFY_LIMIT` | `0` | Max anonymous classifications per window (0 = unlimited) |
| `ANON_CLASSIFY_WINDOW_HOURS` | `2` | Rolling window for anonymous rate limiting |

---

## Health check

The API exposes `GET /api/v1/health` which always returns 200 when the process is up. This is used by Render and Docker for liveness checks.

---

## ML bundle in production

The bundle is baked into the Docker image at build time (copied from `ml/artifacts/bundle/`). To update the model in production, rebuild and redeploy the image with the new bundle.

The bundle path inside the container is controlled by `ARTIFACT_BUNDLE_DIR`. The startup logic resolves relative paths from the project root.
