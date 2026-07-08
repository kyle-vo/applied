"""Demo mode: seed data and canned AI results.

Demo accounts are identified by a "demo_" user_id prefix. They get realistic
pre-seeded data, and their analyze/tailor requests return canned results so
demo traffic never spends real Anthropic API credits.
"""
import hashlib

DEMO_USER_PREFIX = "demo_"


def is_demo_user(user_id: str | None) -> bool:
    return bool(user_id) and user_id.startswith(DEMO_USER_PREFIX)


DEMO_RESUME_NAME = "Jordan Lee — SWE Resume"

DEMO_RESUME_TEXT = """Jordan Lee
San Jose, CA — jordan.lee@example.com — github.com/jordanlee

EDUCATION
BS in Computer Science, San Jose State University — May 2025

TECHNICAL SKILLS
Python, JavaScript, TypeScript, SQL, Java
React, Flask, Node.js, PostgreSQL, Docker, AWS (S3, EC2), Git, CI/CD

PROJECTS
TrailShare — Full-stack hiking route sharing app (React, Flask, PostgreSQL)
- Built REST API with JWT auth serving 40+ endpoints; deployed on AWS with Docker
- Implemented map rendering with Leaflet and GPX file parsing

CourseCompass — Class scheduling tool (TypeScript, Node.js)
- Constraint solver generating conflict-free schedules from 2,000+ course listings
- 120+ weekly active users during registration periods

EXPERIENCE
Software Engineering Intern, Meridian Systems — Summer 2024
- Built internal dashboard (React + FastAPI) used by 3 teams to track deploy health
- Wrote integration tests raising service coverage from 61% to 84%
"""

# Each entry becomes an Application row. days_ago staggers applied_at so the
# dashboard and analytics charts show a realistic multi-week pipeline.
DEMO_APPLICATIONS = [
    {
        "company": "Lumina Labs",
        "role": "Software Engineer, New Grad",
        "location": "San Francisco, CA",
        "status": "interview",
        "days_ago": 21,
        "job_description": (
            "We're hiring new grad software engineers to build our collaboration platform. "
            "Requirements: BS in CS or equivalent, strong Python or TypeScript, experience "
            "with React and REST APIs. Nice to have: PostgreSQL, Docker, AWS."
        ),
        "notes": "Phone screen went well — technical round scheduled.",
        "ai_match_score": 84,
        "ai_analysis": {
            "strengths": [
                "React + Flask full-stack projects map directly to the platform stack",
                "Internship experience with React dashboards and integration testing",
                "PostgreSQL, Docker, and AWS cover all listed nice-to-haves",
            ],
            "gaps": [
                "No professional TypeScript experience beyond personal projects",
                "Collaboration/real-time product domain is new",
            ],
            "keywords": ["Python", "TypeScript", "React", "REST APIs", "PostgreSQL", "Docker", "AWS", "new grad"],
        },
        "follow_up_days": None,
    },
    {
        "company": "Northwind Health",
        "role": "Backend Engineer I",
        "location": "Remote",
        "status": "screening",
        "days_ago": 14,
        "job_description": (
            "Backend Engineer I to build patient-facing APIs. Required: Python, SQL, REST API "
            "design, and testing discipline. Preferred: Flask or Django, HIPAA awareness, CI/CD."
        ),
        "notes": "Recruiter reached out on LinkedIn. Screening call Friday.",
        "ai_match_score": 78,
        "ai_analysis": {
            "strengths": [
                "Flask REST API experience with JWT auth",
                "Demonstrated testing focus (raised coverage 61% → 84% during internship)",
                "CI/CD and Docker experience from personal projects",
            ],
            "gaps": [
                "No healthcare or HIPAA-regulated environment experience",
                "Django not represented on resume",
                "Limited production database operations experience",
            ],
            "keywords": ["Python", "SQL", "REST", "Flask", "testing", "CI/CD", "HIPAA"],
        },
        "follow_up_days": 2,
    },
    {
        "company": "Voltaic",
        "role": "Full Stack Engineer (Early Career)",
        "location": "Austin, TX",
        "status": "applied",
        "days_ago": 10,
        "job_description": (
            "Early-career full stack engineer for our EV fleet management product. React, "
            "Node.js or Python backend, SQL. You'll ship features end to end with a senior mentor."
        ),
        "notes": None,
        "ai_match_score": 81,
        "ai_analysis": {
            "strengths": [
                "End-to-end ownership shown across two shipped full-stack projects",
                "React frontend plus both Node.js and Python backend experience",
                "SQL and PostgreSQL experience",
            ],
            "gaps": [
                "No IoT or fleet/telemetry domain exposure",
                "Node.js experience is project-based rather than professional",
            ],
            "keywords": ["React", "Node.js", "Python", "SQL", "full stack", "early career"],
        },
        "follow_up_days": 5,
    },
    {
        "company": "Parcel",
        "role": "Software Engineer — Logistics Platform",
        "location": "Seattle, WA",
        "status": "applied",
        "days_ago": 7,
        "job_description": (
            "Join our logistics routing team. Required: strong CS fundamentals, Java or Python, "
            "SQL, and interest in optimization problems. Preferred: distributed systems coursework."
        ),
        "notes": "Referral from Sam.",
        "ai_match_score": None,
        "ai_analysis": None,
        "follow_up_days": None,
    },
    {
        "company": "Brightline Studio",
        "role": "Frontend Engineer, New Grad",
        "location": "Los Angeles, CA",
        "status": "applied",
        "days_ago": 4,
        "job_description": (
            "New grad frontend engineer for our creative tools suite. Required: React, TypeScript, "
            "CSS fundamentals, attention to UI detail. Preferred: design system or accessibility experience."
        ),
        "notes": None,
        "ai_match_score": None,
        "ai_analysis": None,
        "follow_up_days": None,
    },
    {
        "company": "Cobalt Financial",
        "role": "Software Developer, Platform",
        "location": "New York, NY",
        "status": "offer",
        "days_ago": 35,
        "job_description": (
            "Platform developer for internal tooling. Required: Python, SQL, Git, and clear "
            "communication. Preferred: Flask, Docker, cloud deployment experience."
        ),
        "notes": "Offer received! Deciding by end of month.",
        "ai_match_score": 88,
        "ai_analysis": {
            "strengths": [
                "Direct match on the full required stack: Python, SQL, Git",
                "Flask, Docker, and AWS cover every preferred qualification",
                "Internal tooling experience from internship dashboard project",
            ],
            "gaps": [
                "No financial services background",
            ],
            "keywords": ["Python", "SQL", "Flask", "Docker", "Git", "internal tools", "cloud"],
        },
        "follow_up_days": None,
    },
    {
        "company": "Helios Analytics",
        "role": "Junior Data Engineer",
        "location": "Denver, CO",
        "status": "rejected",
        "days_ago": 28,
        "job_description": (
            "Junior data engineer to maintain ETL pipelines. Required: Python, SQL, Airflow or "
            "similar orchestration, data warehouse experience. Preferred: Spark, dbt."
        ),
        "notes": "Rejected after screening — they wanted Airflow production experience.",
        "ai_match_score": 54,
        "ai_analysis": {
            "strengths": [
                "Solid Python and SQL foundation",
                "Docker and AWS experience transfers to pipeline infrastructure",
            ],
            "gaps": [
                "No Airflow or orchestration tooling experience",
                "No data warehouse (Snowflake/BigQuery/Redshift) exposure",
                "Missing both preferred skills: Spark and dbt",
                "Role expects data-focused background; resume is app-development focused",
            ],
            "keywords": ["Python", "SQL", "Airflow", "ETL", "data warehouse", "Spark", "dbt"],
        },
        "follow_up_days": None,
    },
    {
        "company": "Quill & Co",
        "role": "Software Engineer, Product",
        "location": "Portland, OR",
        "status": "screening",
        "days_ago": 12,
        "job_description": (
            "Product engineer on our publishing platform. Required: JavaScript/TypeScript, React, "
            "REST or GraphQL APIs. Preferred: Node.js, PostgreSQL, editorial/content product interest."
        ),
        "notes": "Take-home assignment due Sunday.",
        "ai_match_score": 76,
        "ai_analysis": {
            "strengths": [
                "React and TypeScript project experience",
                "Node.js and PostgreSQL cover the preferred stack",
                "Shipped user-facing products with real usage (120+ WAU)",
            ],
            "gaps": [
                "No GraphQL experience",
                "TypeScript depth is limited to one project",
                "No content/publishing domain background",
            ],
            "keywords": ["TypeScript", "React", "GraphQL", "Node.js", "PostgreSQL", "product engineering"],
        },
        "follow_up_days": 1,
    },
]


def _hash_int(text: str) -> int:
    return int(hashlib.sha256(text.encode()).hexdigest(), 16)


def canned_analysis(job_description: str, resume_text: str) -> dict:
    """Deterministic stand-in for analyze_match — demo users never hit Claude.

    The score is derived from the input hash so re-analyzing the same content
    is stable but different job descriptions get different scores.
    """
    score = 55 + _hash_int(resume_text + job_description) % 38  # 55-92
    return {
        "score": score,
        "strengths": [
            "Core language and framework requirements are represented on the resume",
            "Shipped full-stack projects demonstrate end-to-end ownership",
            "Testing and CI/CD experience matches the team's engineering practices",
        ],
        "gaps": [
            "Professional experience is limited to one internship",
            "Some preferred qualifications are project-based rather than production",
            "Domain-specific experience for this role is not evident",
        ],
        "keywords": ["Python", "TypeScript", "React", "REST APIs", "SQL", "Docker", "CI/CD", "testing"],
        "demo": True,
    }


def canned_tailor(job_description: str, resume_text: str) -> dict:
    """Deterministic stand-in for tailor_resume for demo users."""
    return {
        "tailored_summary": (
            "Recent CS graduate with hands-on full-stack experience shipping React and "
            "Flask applications to production, seeking to apply strong testing discipline "
            "and end-to-end ownership to this role."
        ),
        "rewrites": [
            {
                "context": "Skills section",
                "suggested": "Move the technologies named in this job description to the front of your skills list.",
                "why": "Recruiters and ATS scanners weight the first skills they see.",
            },
            {
                "context": "Most relevant project",
                "suggested": "Lead the project bullet with the outcome (users, uptime, coverage) before the tech stack.",
                "why": "Outcome-first bullets read as impact rather than a tools inventory.",
            },
        ],
        "keywords_to_add": ["REST API design", "code review", "agile", "unit testing"],
        "demo": True,
    }
