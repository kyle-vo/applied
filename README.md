# Applied — Job Application Tracker

![CI](https://github.com/kyle-vo/applied/actions/workflows/ci.yml/badge.svg)

A full-stack job application tracker with AI-powered resume analysis, a kanban pipeline, and a Chrome extension that captures job postings from 8 job boards in one click.

### ▶ [**Try the live demo — no sign-up**](https://frontend-production-ab8c.up.railway.app)

Click **"Try the demo"** on the sign-in page. You get an isolated account pre-seeded with a realistic pipeline — every feature works, and the session cleans itself up after 24 hours.

![Dashboard](docs/screenshots/dashboard.png)

---

## Features

- **Kanban pipeline** — drag-and-drop cards across Applied → Screening → Interview → Offer
- **AI match scoring** — Claude scores your resume against each job description: score, strengths, gaps, keywords
- **AI resume tailoring** — tailored summary, copy-pasteable bullet rewrites, and keywords to add per application
- **Chrome extension** — one-click capture from LinkedIn, Indeed, Greenhouse, Lever, Workday, Ashby, Simplify, and Handshake
- **Analytics** — pipeline funnel, response rate, score distribution, application activity over time
- **Resume management** — PDF (stored in S3, text extracted) or plain text; multiple resumes
- **Demo mode** — one click creates an isolated, seeded 24-hour account; demo AI calls return canned results so they can never spend API credits
- **Follow-up tracking** — per-application follow-up dates

| AI Analysis | Analytics |
|---|---|
| ![AI Analysis](docs/screenshots/analysis.png) | ![Analytics](docs/screenshots/analytics.png) |

---

## Architecture

```mermaid
flowchart LR
    subgraph Clients
        W[React SPA<br/>Vite + Tailwind]
        X[Chrome Extension<br/>Manifest V3]
    end
    subgraph Backend["Flask API"]
        A[Auth middleware<br/>Clerk JWT + hashed API keys]
        R[REST routes]
        AI[AI service]
    end
    W -- "Bearer JWT (Clerk)" --> A
    X -- "X-API-Key" --> A
    A --> R
    R --> P[(PostgreSQL)]
    R --> S3[(AWS S3<br/>resume PDFs)]
    AI --> C[Claude API]
    R --> AI
```

- **Two auth paths:** the web app sends short-lived Clerk JWTs (verified against Clerk's JWKS); the extension uses long-lived API keys, stored as SHA-256 hashes and revocable in Settings.
- **AI cost control:** analysis results are keyed by a SHA-256 content hash of (resume + job description) — unchanged content never triggers a duplicate Claude call. `?force=true` re-runs. Demo accounts always get canned results.
- **User isolation:** every query is scoped to the authenticated `user_id`; covered by tests.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, TypeScript |
| Auth | Clerk (JWT) + hashed long-lived API keys |
| Backend | Flask, SQLAlchemy, Gunicorn |
| Database | PostgreSQL (SQLite in tests) |
| Storage | AWS S3 (resume PDFs, presigned URLs) |
| AI | Anthropic API (claude-sonnet-4-6) |
| Testing | pytest (51 tests) · Vitest + React Testing Library (17 tests) |
| CI/CD | GitHub Actions — both suites + build on every push/PR |
| Deploy | Railway (live) · Terraform for GCP Cloud Run/Cloud SQL ([terraform/](terraform/)) |

---

## Testing

```bash
# Backend — in-memory SQLite, Claude mocked, real API-key auth path
cd backend && python -m pytest

# Frontend
cd frontend && npm test
```

Coverage includes auth (invalid/missing/revoked credentials), CRUD + summary stats, user isolation, the analyze flow (content-hash dedup, force re-run, AI failure → 502), API key lifecycle, and demo-mode guarantees (isolation per session, expired-account cleanup, and a test asserting demo analyze/tailor **never** call Claude).

---

## Project Structure

```
applied/
├── docker-compose.yml
├── .github/workflows/ci.yml           # pytest + vitest + build on every push
├── terraform/                          # IaC: GCP Cloud Run + Cloud SQL + Secret Manager
├── backend/
│   ├── app/
│   │   ├── middleware/auth.py          # Clerk JWT + X-API-Key auth
│   │   ├── models/                     # Application, Resume, ApiKey
│   │   ├── routes/                     # applications (+ analyze/tailor), resumes, keys, demo
│   │   └── services/
│   │       ├── ai.py                   # analyze_match(), tailor_resume() — Claude
│   │       └── demo.py                 # seeded demo data + canned AI results
│   └── tests/                          # 51 pytest tests
├── frontend/
│   └── src/                            # React SPA + Vitest tests
└── extension/
    ├── content.js                      # scrapers for 8 job boards
    └── popup.js                        # captures the active tab's job into the tracker
```

---

## Running Locally

**Prerequisites:** Docker, Node.js 18+, a Clerk account, an Anthropic API key

```bash
git clone https://github.com/kyle-vo/applied.git
cd applied
```

Create `backend/.env`:

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://trackr_user:trackr_pass@localhost:5432/trackr
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://localhost:3000
```

Create `frontend/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Then:

```bash
# Backend (Postgres via Docker, Flask on :5000)
docker-compose up -d
cd backend && pip install -r requirements.txt && flask db upgrade && flask run

# Frontend (:3000, proxies /api to Flask)
cd frontend && npm install && npm run dev
```

### Chrome extension

1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `extension/`
2. In the app: Settings → generate an API key → paste it into the extension's settings

---

## API Reference

All endpoints require `Authorization: Bearer <clerk_token>` or `X-API-Key: <key>` unless noted.

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check (no auth) |
| POST | /api/demo/start | Create a seeded 24h demo account, returns API key (no auth) |
| GET | /api/applications | List all + summary stats |
| POST | /api/applications | Create (409 + `?force=true` duplicate handling) |
| GET/PATCH/DELETE | /api/applications/:id | Single application |
| POST | /api/applications/:id/analyze | AI match scoring (content-hash dedup, `?force=true`) |
| POST | /api/applications/:id/tailor | AI resume tailoring |
| GET/POST | /api/keys · DELETE /api/keys/:id | API key lifecycle (raw key shown once) |
| GET/POST | /api/resumes · PATCH/DELETE /api/resumes/:id | Resume management |

---

## Deployment

Live on **Railway** (frontend, backend, PostgreSQL). Migrations: `flask db upgrade` in the backend console after deploying one.

An alternative **Terraform** deployment to Google Cloud (Cloud Run + Cloud SQL + Secret Manager, least-privilege service account) lives in [terraform/](terraform/README.md).
