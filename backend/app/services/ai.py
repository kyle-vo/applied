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
                "content": f"""You are a critical technical recruiter scoring a candidate's resume against a job description.

Scoring rubric — use the FULL range:
- 90-100: Exceptional fit. Meets virtually all required AND preferred qualifications with directly relevant experience.
- 75-89: Strong fit. Meets all core required skills; gaps are minor or in preferred-only areas.
- 60-74: Moderate fit. Meets most required skills but has meaningful gaps in required areas.
- 40-59: Weak fit. Missing multiple required skills or clearly lacks the experience level the role demands.
- 0-39: Poor fit. Wrong domain, skill set, or experience level entirely.

Penalty rules:
- Each missing REQUIRED skill: -8 to -15 points depending on how central it is to the role
- Each missing PREFERRED skill: -2 to -5 points
- No formal internship/work experience when required: -10 points
- Wrong domain or overqualified/underqualified: apply poor fit range

Only score 80+ if the candidate clearly meets the core technical requirements with minimal gaps. Be honest and critical — do not default to the middle of the range.

Resume:
{resume_text}

Job Description:
{job_description}

Respond with ONLY a valid JSON object — no markdown, no commentary:
{{
  "score": <integer 0-100>,
  "strengths": [<3-5 specific ways the resume matches the JD>],
  "gaps": [<3-5 specific skills or experience gaps>],
  "keywords": [<8-12 important keywords/skills from the JD>]
}}""",
            }
        ],
    )

    return json.loads(message.content[0].text)
