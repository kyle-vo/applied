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
                "content": f"""You are a technical recruiter reviewing a candidate's resume against a job description.

Resume:
{resume_text}

Job Description:
{job_description}

Analyze the match and respond with ONLY a valid JSON object — no markdown, no commentary:
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
