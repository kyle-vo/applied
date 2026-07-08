# Applied — Job Application Tracker

## What this is
A full-stack job application tracker built by Kyle Vo. Tracks job applications through a kanban pipeline (Applied → Screening → Interview → Offer) with AI-powered resume-to-JD match scoring via the Anthropic API.

## Stack
- **Frontend:** React 18 + Vite + Tailwind CSS + Clerk (auth) + @hello-pangea/dnd (drag and drop)
- **Backend:** Flask + SQLAlchemy + PostgreSQL + Redis
- **Auth:** Clerk (JWT verified on every backend request via `app/middleware/auth.py`) + long-lived API keys for the browser extension (`X-API-Key` header)
- **AI:** Anthropic API — `claude-sonnet-4-6` — live in `backend/app/services/ai.py`
- **Deploy:** Railway — live at https://frontend-production-ab8c.up.railway.app (backend: https://backend-production-e4a61.up.railway.app)

## Project structure
```
applied/
├── docker-compose.yml
├── backend/
│   ├── wsgi.py
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py                        # App factory
│       ├── middleware/auth.py                 # Clerk JWT + X-API-Key auth, @require_auth
│       ├── models/application.py              # Application model
│       ├── models/api_key.py                  # ApiKey model (api_keys table)
│       ├── models/resume.py                   # Resume model
│       ├── routes/applications.py             # CRUD + POST /analyze
│       ├── routes/keys.py                     # GET/POST /api/keys, DELETE /api/keys/:id
│       ├── routes/resumes.py
│       ├── routes/settings.py
│       ├── routes/health.py
│       └── services/ai.py                     # analyze_match() — calls Claude
└── frontend/
    └── src/
        ├── api.js                             # useApi hook (auto-attaches auth)
        ├── useApplications.js                 # Central data hook
        ├── App.jsx
        ├── Navbar.jsx
        ├── Dashboard.jsx
        ├── Applications.jsx
        ├── Analysis.jsx                       # Collapsible scored cards + Re-analyze
        ├── Settings.jsx                       # Resume upload + API key management
        ├── KanbanBoard.jsx
        ├── JobModal.jsx
        └── MatchBadge.jsx
extension/
    ├── manifest.json
    ├── popup.html / popup.js                  # Uses X-API-Key header (not Bearer JWT)
    ├── settings.html / settings.js            # Stores apiKey in chrome.storage.sync
    └── content.js
```

## API endpoints
All endpoints require either `Authorization: Bearer <clerk_token>` or `X-API-Key: <key>`.

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check (no auth) |
| GET | /api/applications | List all + summary stats |
| POST | /api/applications | Create application |
| GET | /api/applications/:id | Get single |
| PATCH | /api/applications/:id | Update fields |
| DELETE | /api/applications/:id | Delete |
| POST | /api/applications/:id/analyze | Run AI match scoring (1hr Redis cache, ?force=true to bypass) |
| GET | /api/keys | List API keys |
| POST | /api/keys | Generate new API key (returns raw key once) |
| DELETE | /api/keys/:id | Revoke API key |
| GET/POST | /api/resumes | Resume management |

## Auth flows
- **Web app:** Clerk JWT via `Authorization: Bearer` header — auto-attached by `useApi` hook
- **Browser extension:** Long-lived API key via `X-API-Key` header — generated once in Settings, stored in `chrome.storage.sync` as `apiKey`, never expires
- `@require_auth` checks `X-API-Key` first, falls back to Clerk JWT

## AI scoring
- Route: `POST /api/applications/:id/analyze`
- Requires a job description on the application and at least one saved resume
- Calls `backend/app/services/ai.py → analyze_match(job_description, resume_text)`
- Model: `claude-sonnet-4-6`, returns `{ score, strengths[], gaps[], keywords[] }`
- Scoring rubric: 90-100 exceptional, 75-89 strong, 60-74 moderate, 40-59 weak, 0-39 poor
- Results cached in Redis for 1 hour (`analysis:{app_id}`); Re-analyze passes `?force=true` to bypass
- Analysis.jsx shows collapsible cards sorted by score

## Database migrations
Latest migration: `d5a3b1e9f2c6` (adds `api_keys` table)
To apply on Railway: open backend Console → `flask db upgrade`

## Environment variables

### Backend (.env)
```
FLASK_ENV=development
SECRET_KEY=...
DATABASE_URL=postgresql://trackr_user:trackr_pass@localhost:5432/trackr
REDIS_URL=redis://localhost:6379/0
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Running locally
```bash
# Backend
cd applied && docker-compose up
cd backend && flask db upgrade

# Frontend
cd applied/frontend && npm install && npm run dev
```

## Testing
```bash
# Backend — pytest (44 tests, in-memory SQLite, Claude mocked, real X-API-Key auth path)
cd backend && .venv/Scripts/python -m pytest

# Frontend — Vitest + React Testing Library (13 tests)
cd frontend && npm test
```
- Backend tests live in `backend/tests/` — auth, applications CRUD + summary stats, analyze (dedup/force/502), API keys, resumes, user isolation
- Frontend tests: `src/MatchBadge.test.tsx`, `src/useApplications.test.ts` (useApi mocked)
- CI: `.github/workflows/ci.yml` runs both suites + frontend build on every push/PR

## What's done
- [x] Docker Compose setup (Postgres + Redis + Flask)
- [x] Clerk JWT auth + long-lived API key auth for extension
- [x] Full CRUD for applications with summary stats
- [x] Kanban board with drag-and-drop status updates
- [x] Applications list page with search + status filter
- [x] Follow-up date tracking
- [x] AI match scoring via Claude (analyze_match, collapsible Analysis page)
- [x] Resume upload/management (PDF + plain text)
- [x] Chrome extension — scrapes JD, submits via API key auth
- [x] Settings page — resume management + API key generate/revoke
- [x] Deployed on Railway (frontend + backend + Postgres + Redis)
- [x] UTC timestamp fix (applied_at displays correctly in local time)
- [x] Test suites (pytest + Vitest) with GitHub Actions CI

## Kyle's goals
1. **Deploy to Railway** — ✅ live
2. **Resume project** — ✅ on resume as shipped full-stack AI app with Chrome extension

## Key design decisions
- **Clerk for auth** — saves time vs rolling JWT, handles session management
- **API keys for extension** — long-lived SHA-256 hashed keys; extension never needs to refresh
- **`useApplications` hook** — single source of truth for all app data, avoids prop drilling
- **`useApi` hook** — auto-attaches Clerk token to every request
- **Kanban drag-and-drop** — uses `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd)
- **Vite proxy** — frontend dev server proxies `/api` to Flask, no CORS issues in dev
- **1hr Redis cache on analysis** — avoids repeat Claude API calls; Re-analyze bypasses with `?force=true`
