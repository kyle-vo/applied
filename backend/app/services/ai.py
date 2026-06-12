import json
import os
import anthropic
from flask import current_app


def analyze_match(job_description: str, resume_text: str) -> dict:
    """Call Claude to score resume vs job description. Returns score + analysis."""
    api_key = current_app.config.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_API_KEY", "")
    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": f"""You are a harsh but fair technical recruiter scoring a resume against a job description. Your job is to give an accurate, unvarnished score — not to encourage the candidate.

Scoring rubric — be strict, use the full range:
- 90-100: Exceptional fit. Meets virtually all required AND preferred qualifications with directly relevant professional experience.
- 75-89: Strong fit. Meets all core required skills and experience level; gaps are minor or preferred-only.
- 60-74: Moderate fit. Meets most required skills but has meaningful gaps (missing 1-2 required skills, or experience level slightly short).
- 40-59: Weak fit. Missing multiple required skills OR clearly lacks the experience level demanded (e.g., role requires professional experience but candidate only has academic projects).
- 0-39: Poor fit. Wrong domain, skill set, or experience level entirely.

Penalty rules (cumulative — apply all that apply):
- Each missing REQUIRED skill: -8 to -15 points depending on centrality to the role
- Each missing PREFERRED skill: -3 to -6 points
- Experience level shortfall (role requires N years of professional experience but candidate only has student/personal projects): -15 points
- 4 or more total gaps: additional -5 points compounding penalty
- Wrong domain: apply 0-39 range

Critical rules:
- Personal/school projects do NOT count as professional or industry experience. If a role explicitly requires "X years of experience," only paid employment or internships satisfy it.
- Do not soften scores. If the honest score is 52, do not round up to 60.
- Score 75+ only if the candidate genuinely meets both the core technical requirements AND the experience level required.
- A candidate benefits more from an accurate low score than a flattering inaccurate one.

Resume:
{resume_text}

Job Description:
{job_description}

Respond with ONLY a valid JSON object — no markdown, no commentary:
{{
  "score": <integer 0-100>,
  "strengths": [<3-5 specific ways the resume matches the JD>],
  "gaps": [<3-5 specific skills or experience gaps, ordered by severity>],
  "keywords": [<8-12 important keywords/skills from the JD>]
}}""",
            }
        ],
    )

    return json.loads(message.content[0].text)
