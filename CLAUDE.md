# Applied — Job Application Tracker

## What this is
A full-stack job application tracker built by Kyle Vo. Tracks job applications through a kanban pipeline (Applied → Screening → Interview → Offer) with AI-powered resume-to-JD match scoring via the Anthropic API.

## Stack
- **Frontend:** React 18 + Vite + Tailwind CSS + Clerk (auth) + @hello-pangea/dnd (drag and drop)
- **Backend:** Flask + SQLAlchemy + PostgreSQL + Redis
- **Auth:** Clerk (JWT verified on every backend request via `app/middleware/auth.py`)
- **AI:** Anthropic API — claude-sonnet-4-20250514 (Phase 2, not yet implemented)
- **Deploy:** Railway (switching from Render.com — goal is to get this live on Railway)

## Project structure
```
applied/
├── docker-compose.yml         # Postgres + Redis + Flask
├── backend/
│   ├── wsgi.py                # Flask entrypoint
│   ├── requirements.txt
│   ├── .env.example           # Copy to .env and fill in keys
│   └── app/
│       ├── __init__.py        # App factory (create_app)
│       ├── middleware/auth.py # Clerk JWT verification + @require_auth decorator
│       ├── models/application.py  # Application model + ApplicationStatus enum
│       ├── routes/applications.py # CRUD endpoints
│       └── routes/health.py   # GET /health
└── frontend/
    ├── .env.example           # Copy to .env, add VITE_CLERK_PUBLISHABLE_KEY
    └── src/
        ├── lib/api.js         # Authenticated fetch wrapper (useApi hook)
        ├── hooks/useApplications.js  # Central data hook used by all pages
        ├── components/
        │   ├── Navbar.jsx
        │   ├── KanbanBoard.jsx    # Drag and drop, calls updateStatus on drop
        │   ├── JobModal.jsx       # Add/edit modal, includes job_description field
        │   └── MatchBadge.jsx     # Color-coded score badge (green/yellow/red)
        └── pages/
            ├── Dashboard.jsx      # Stats cards + kanban board
            ├── Applications.jsx   # Filterable table with full CRUD
            └── Analysis.jsx       # AI analysis page (Phase 2 placeholder)
```

## API endpoints
All endpoints require `Authorization: Bearer <clerk_token>` header.

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check (no auth) |
| GET | /api/applications | List all + summary stats |
| POST | /api/applications | Create application |
| GET | /api/applications/:id | Get single |
| PATCH | /api/applications/:id | Update fields |
| DELETE | /api/applications/:id | Delete |

### Application fields
```python
company          # str, required
role             # str, required
location         # str, optional
job_url          # str, optional
job_description  # text, optional — used for AI scoring
status           # enum: applied | screening | interview | offer | rejected | withdrawn
ai_match_score   # int 0-100, set by AI service
ai_analysis      # JSON: { strengths: [], gaps: [], keywords: [] }
notes            # text, optional
follow_up_at     # datetime, optional
applied_at       # datetime, auto
```

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

### Backend
```bash
cd applied
docker-compose up           # starts Postgres + Redis + Flask on :5000
# First time only:
cd backend
flask db init
flask db migrate -m "init"
flask db upgrade
```

### Frontend
```bash
cd applied/frontend
cp .env.example .env        # add your Clerk publishable key
npm install
npm run dev                 # runs on :3000, proxies /api to :5000
```

### Verify it works
- Backend: http://localhost:5000/health → `{"api":"ok","db":"ok","redis":"ok"}`
- Frontend: http://localhost:3000 → redirects to Clerk sign-in

## What's done (Phase 1)
- [x] Docker Compose setup (Postgres + Redis + Flask)
- [x] Flask app factory with SQLAlchemy + Flask-Migrate
- [x] Clerk JWT auth middleware (`@require_auth` decorator)
- [x] Full CRUD for applications with summary stats
- [x] React + Vite + Tailwind frontend
- [x] Clerk auth integration (sign in/out, protected routes)
- [x] Kanban board with drag-and-drop status updates
- [x] Add/edit/delete modal with job description field
- [x] Applications list page with search + status filter
- [x] Follow-up date tracking

## Kyle's goals for this project
1. **Deploy to Railway** — get the full stack (Flask + Postgres + Redis + frontend) live on Railway
2. **Resume project** — once live, this goes on Kyle's resume as a shipped full-stack AI app

## What's next (Phase 2 — AI scoring)
The `job_description` field is already stored. The plan:

1. Create `backend/app/services/ai.py` — call Anthropic API with:
   - Kyle's resume (stored as a constant or uploaded via settings)
   - The job description
   - Prompt asking for match score (0-100), strengths[], gaps[], keywords[]
   - Return structured JSON

2. Add `POST /api/applications/:id/analyze` route that:
   - Calls the AI service
   - Updates `ai_match_score` and `ai_analysis` on the application
   - Caches result in Redis (key: `analysis:{app_id}`) to avoid repeat API calls

3. Wire up `Analysis.jsx` to trigger analysis and display results per application

## Key design decisions
- **Clerk for auth** — saves time vs rolling JWT, handles session management
- **`useApplications` hook** — single source of truth for all app data, avoids prop drilling
- **`useApi` hook** — auto-attaches Clerk token to every request, no manual auth headers anywhere
- **Kanban drag-and-drop** — uses `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd)
- **Vite proxy** — frontend dev server proxies `/api` to Flask, no CORS issues in dev
