# Applied — Job Application Tracker

A full-stack job application tracker with AI-powered resume analysis, a kanban pipeline, and a Chrome extension that scrapes job postings directly from job boards.

**Live:** https://frontend-production-ab8c.up.railway.app

---

## Features

- **Kanban pipeline** — drag-and-drop cards across Applied → Screening → Interview → Offer
- **AI match scoring** — paste a job description and get a match score, strengths, gaps, and keywords against your resume via Claude
- **AI resume tailoring** — get a tailored summary, bullet point rewrites, and keywords to add for each application
- **Chrome extension** — one-click job capture from LinkedIn, Indeed, Greenhouse, Lever, Workday, Ashby, Simplify, and Handshake
- **Resume management** — upload multiple resumes (PDF or plain text); AI uses your latest
- **Analytics** — pipeline funnel, response rate, avg match score, and application activity over time
- **Follow-up tracking** — set follow-up dates per application

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | Clerk (JWT) |
| Drag and drop | @hello-pangea/dnd |
| Backend | Flask + SQLAlchemy |
| Database | PostgreSQL |
| Cache | Redis |
| AI | Anthropic API (claude-sonnet-4-6) |
| Deploy | Railway |

---

## Project Structure

```
applied/
├── docker-compose.yml
├── backend/
│   ├── wsgi.py
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── middleware/auth.py          # Clerk JWT + API key auth
│       ├── models/
│       │   ├── application.py
│       │   ├── api_key.py
│       │   └── resume.py
│       ├── routes/
│       │   ├── applications.py         # CRUD + /analyze + /tailor
│       │   ├── keys.py
│       │   ├── resumes.py
│       │   └── settings.py
│       └── services/
│           └── ai.py                   # analyze_match(), tailor_resume()
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api.js                      # useApi hook (auto-attaches auth)
│       ├── useApplications.js          # Central data hook
│       ├── Dashboard.jsx
│       ├── Applications.jsx
│       ├── Analysis.jsx
│       ├── Analytics.jsx
│       ├── KanbanBoard.jsx
│       ├── JobModal.jsx
│       ├── Settings.jsx
│       └── Toast.jsx
└── extension/
    ├── manifest.json
    ├── popup.html / popup.js
    ├── settings.html / settings.js
    └── content.js                      # Scrapers for 8 job boards
```

---

## Running Locally

**Prerequisites:** Docker, Node.js 18+, a Clerk account, an Anthropic API key

### 1. Clone and configure

```bash
git clone https://github.com/kyle-vo/applied.git
cd applied
```

Create `backend/.env`:

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://trackr_user:trackr_pass@localhost:5432/trackr
REDIS_URL=redis://localhost:6379/0
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://localhost:3000
```

Create `frontend/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 2. Start the backend

```bash
docker-compose up -d
cd backend
pip install -r requirements.txt
flask db upgrade
flask run
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:3000`. The Vite dev server proxies `/api` to Flask.

### 4. Load the Chrome extension

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Open Settings in the app, generate an API key, paste it into the extension settings

---

## Chrome Extension

Supports one-click job capture from:

- LinkedIn (job pages + search results)
- Indeed
- Greenhouse
- Lever
- Workday
- Ashby
- Simplify
- Handshake

The extension uses a long-lived API key (generated in Settings) instead of Clerk JWT, so it stays authenticated without needing to log in.

> **Note:** On LinkedIn search results pages, only the job title, company, and location are captured. Visit the individual job page (`/jobs/view/ID`) to also capture the job description.

---

## AI Features

### Match Scoring (`POST /api/applications/:id/analyze`)

Compares your resume against the job description and returns:
- **Score** (0–100) with rubric: 90–100 exceptional, 75–89 strong, 60–74 moderate, 40–59 weak, 0–39 poor
- **Strengths** — where your resume aligns
- **Gaps** — missing skills or experience
- **Keywords** — key terms from the JD, color-coded by match status

Results are cached in Redis for 1 hour. Use **Re-analyze** to bypass the cache.

### Resume Tailoring (`POST /api/applications/:id/tailor`)

Generates:
- A tailored professional summary for the specific role
- Suggested rewrites for existing bullet points
- Keywords to weave into your resume

Results are persisted to the database and survive page refresh. Use **Re-tailor** to regenerate.

---

## API Reference

All endpoints require `Authorization: Bearer <clerk_token>` or `X-API-Key: <key>`.

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check (no auth) |
| GET | /api/applications | List all + summary stats |
| POST | /api/applications | Create application |
| GET | /api/applications/:id | Get single |
| PATCH | /api/applications/:id | Update fields |
| DELETE | /api/applications/:id | Delete |
| POST | /api/applications/:id/analyze | Run AI match scoring |
| POST | /api/applications/:id/tailor | Run AI resume tailoring |
| GET | /api/keys | List API keys |
| POST | /api/keys | Generate new API key |
| DELETE | /api/keys/:id | Revoke API key |
| GET | /api/resumes | List resumes |
| POST | /api/resumes | Upload resume |

---

## Deployment

Deployed on Railway with four services: frontend, backend, PostgreSQL, Redis.

After deploying a migration, run `flask db upgrade` in the Railway backend console.
