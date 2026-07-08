import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify

from app import db
from app.models.api_key import ApiKey
from app.models.application import Application, ApplicationStatus
from app.models.resume import Resume
from app.services.demo import (
    DEMO_APPLICATIONS,
    DEMO_RESUME_NAME,
    DEMO_RESUME_TEXT,
    DEMO_USER_PREFIX,
)

demo_bp = Blueprint("demo", __name__)

DEMO_TTL_HOURS = 24


def _utcnow_naive() -> datetime:
    # Column values are stored without tzinfo, so comparisons must be naive too
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _cleanup_expired_demo_users():
    cutoff = _utcnow_naive() - timedelta(hours=DEMO_TTL_HOURS)
    expired_keys = ApiKey.query.filter(
        ApiKey.user_id.like(DEMO_USER_PREFIX + "%"),
        ApiKey.created_at < cutoff,
    ).all()
    for key in expired_keys:
        resumes = Resume.query.filter_by(user_id=key.user_id).all()
        for resume in resumes:
            if resume.s3_key:
                from app.routes.resumes import delete_s3_object
                delete_s3_object(resume.s3_key)
            db.session.delete(resume)
        Application.query.filter_by(user_id=key.user_id).delete()
        ApiKey.query.filter_by(user_id=key.user_id).delete()
    db.session.commit()


# ── POST /api/demo/start ───────────────────────────────────────────────────────
# No auth: this is the public entry point that creates an isolated demo account.
@demo_bp.route("/demo/start", methods=["POST"])
def start_demo():
    _cleanup_expired_demo_users()

    user_id = DEMO_USER_PREFIX + uuid.uuid4().hex[:12]
    raw_key = "apk_" + secrets.token_hex(32)
    db.session.add(
        ApiKey(
            user_id=user_id,
            key_hash=hashlib.sha256(raw_key.encode()).hexdigest(),
            prefix=raw_key[:12],
        )
    )

    db.session.add(Resume(user_id=user_id, name=DEMO_RESUME_NAME, resume_text=DEMO_RESUME_TEXT))

    now = _utcnow_naive()
    for spec in DEMO_APPLICATIONS:
        db.session.add(
            Application(
                user_id=user_id,
                company=spec["company"],
                role=spec["role"],
                location=spec["location"],
                job_description=spec["job_description"],
                status=ApplicationStatus(spec["status"]),
                notes=spec["notes"],
                ai_match_score=spec["ai_match_score"],
                ai_analysis=spec["ai_analysis"],
                applied_at=now - timedelta(days=spec["days_ago"]),
                follow_up_at=(
                    now + timedelta(days=spec["follow_up_days"])
                    if spec["follow_up_days"] is not None
                    else None
                ),
            )
        )

    db.session.commit()
    return jsonify({"key": raw_key, "expires_in_hours": DEMO_TTL_HOURS}), 201
