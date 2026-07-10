# Migration: Railway → Vercel + Render + Neon ($0/month)

Target architecture:

| Piece | Host | Plan |
|---|---|---|
| React frontend | Vercel | Hobby (free) |
| Flask backend | Render | Free (spins down after 15 min idle; ~1 min cold start) |
| PostgreSQL | Neon | Free (0.5 GB) |

## 0. Back up the Railway database FIRST (before credits expire)

Grab the `DATABASE_URL` from Railway → Postgres service → Connect tab, then:

```powershell
# Using Docker (no local Postgres tools needed):
docker run --rm postgres:16 pg_dump "RAILWAY_DATABASE_URL" > applied_backup.sql
```

Keep `applied_backup.sql` somewhere safe. Everything else is recoverable; data is not.

## 1. Neon (database)

1. Sign up at https://neon.tech (free, no card) → create project `applied` (Postgres 16).
2. Copy the connection string — it looks like
   `postgresql://user:pass@ep-xxx.us-west-2.aws.neon.tech/neondb?sslmode=require`
   (keep `?sslmode=require`).
3. Import the backup:
   ```powershell
   docker run --rm -i postgres:16 psql "NEON_DATABASE_URL" < applied_backup.sql
   ```

## 2. Render (backend)

1. Sign up at https://render.com (free, no card) → **New → Blueprint** → connect the
   `kyle-vo/applied` repo. Render reads `render.yaml` from the repo root.
2. When prompted, fill in the env vars: `DATABASE_URL` (Neon string), Clerk keys,
   `ANTHROPIC_API_KEY`, and the AWS keys (same values as Railway).
3. Deploy. The start command runs `flask db upgrade` automatically.
4. Note the URL, e.g. `https://applied-backend.onrender.com` — check
   `https://applied-backend.onrender.com/health` returns `{"api":"ok","db":"ok"}`.

## 3. Vercel (frontend)

1. Sign up at https://vercel.com with GitHub (free, no card) → **Add New → Project**
   → import `kyle-vo/applied`.
2. Settings during import:
   - **Root Directory:** `frontend`
   - Framework preset: Vite (auto-detected)
3. Environment variables:
   - `VITE_API_URL` = `https://applied-backend.onrender.com/api`  ← include the `/api` suffix
   - `VITE_CLERK_PUBLISHABLE_KEY` = same pk_... as before
4. Deploy → you get `https://<project>.vercel.app`.
   (`frontend/vercel.json` handles the SPA fallback so /dashboard etc. don't 404.)

## 4. Point everything at the new domains

- **Clerk dashboard** → your app → Domains/Allowed origins: add the vercel.app URL.
- **Render env** → `FRONTEND_URL` isn't required (CORS is open on /api), skip.
- **Chrome extension** → its settings store the backend URL; update it to the
  Render URL. Regenerate/verify the API key still works (it will — same DB).
- **README** — update the live-demo link to the Vercel URL.

## 5. Verify

1. Open the Vercel URL in incognito → sign-in page loads (Clerk OK).
2. Click "Try the demo" → dashboard with seeded data (backend + DB OK).
   First click after idle may take ~1 min (Render free cold start).
3. Sign into your real account → your data is there (migration OK).
4. Extension: capture a job → appears in tracker (API key path OK).

## Known tradeoff: Render free cold starts

After 15 idle minutes the backend sleeps; the next request waits ~50-60 s.
Options if this bothers you later:
- Move the backend to Google Cloud Run (fast cold starts, real free tier,
  needs a billing card) — the Terraform in `terraform/` already does this;
  swap the Cloud SQL bits for the Neon `DATABASE_URL`.
