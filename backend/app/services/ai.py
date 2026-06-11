import json
import os
import anthropic
from flask import current_app

# Paste your resume here as plain text
RESUME = """
Kyle Vo
Rosemead, CA
kylevwrk@gmail.com — (626) 500-5890 — github.com/kyle-vo — linkedin.com/in/kylevo24
EDUCATION
Bachelor of Science in Computer Science
California State University, Los Angeles, CA
TECHNICAL SKILLS
May 2025
Programming Languages: Python, Java, JavaScript, SQL, C#
Backend & APIs: Flask, REST APIs, Gunicorn
Databases: PostgreSQL, Redis, H2
DevOps: Docker, Docker Compose, Git, CI/CD
Frontend: HTML, CSS, JavaScript, Streamlit
Additional: Apache Airflow, ETL Pipelines, PyTorch
PROJECTS
Real-Time Odds Comparison Engine — Github — Website
Nov 2025- Jan 2026
• Optimized API efficiency by 65% (141→50 calls/refresh) by implementing key rotation across 10
API keys, removing redundant requests, and filtering unnecessary market data.
• Engineered value detection algorithm identifying +EV betting opportunities by converting Amer
ican odds to scaled metrics and calculating cross-bookmaker price differentials.
• Resolved production worker timeouts affecting 100% of page loads by profiling API latency bot
tlenecks and tuning Gunicorn configuration from 30s to 120s timeout.
• Built REST API serving real-time odds data across 3 endpoints by integrating TheOddsAPI with
file-based caching layer reducing response times to <200ms.
• Deployed full-stack web application to Render.com using GitHub CI/CD pipeline for automatic
deployments from main branch.
Rock RMS Payment Gateway Plugin — Github
Oct 2025
• Built production-ready C# payment gateway plugin integrating NMI payment processing with
Rock RMS church management software.
• Implemented secure credit card and ACH transactions, scheduled payments, and customer vault
functionality compliant with PCI standards.
• Deployed and validated in IIS using NMI sandbox with 10+ successful test transactions; published
as an open-source GitHub project with full documentation.
Brain MRI Tumor Segmentation — Team Project
Jan 2025- May 2025
• Built and trained deep learning models for brain tumor segmentation achieving 0.91 Dice Co
efficient and 0.85 IoU with MedSAM architecture (17% improvement over 0.78 IoU baseline)
implemented in PyTorch.
• Engineered U-Net architecture from scratch leveraging encoder-decoder design and skip connec
tions for pixel-level segmentation across medical imaging dataset.
• Improvedmodelgeneralization by implementing data augmentation pipelines, learning rate schedul
ing, and optimizer tuning (Adam, SGD) evaluated using Dice Coefficient and IoU metrics.
Data Engineering & Analytics Project — Github
Jan 2025- May 2025
• Designed and automated a multi-stage ETL pipeline using Apache Airflow and Python to process
190K+ records with data validation handling missing values and schema standardization.
• Containerized microservices using Docker Compose, integrating Airflow, PostgreSQL, and Redis
for scalable workflow orchestration.
• Developed an interactive Streamlit dashboard visualizing 350+ currency exchange pairs with real
time filtering and time-series analysis
"""


def analyze_match(job_description: str) -> dict:
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
{RESUME}

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
