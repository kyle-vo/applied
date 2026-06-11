import json
from flask import Blueprint, request, jsonify, g
from app import db, redis_client
from app.models.application import Application, ApplicationStatus
from app.middleware.auth import require_auth
from datetime import datetime

applications_bp = Blueprint("applications", __name__)


# ── GET /api/applications ──────────────────────────────────────────────────────
@applications_bp.route("/applications", methods=["GET"])
@require_auth
def list_applications():
    status = request.args.get("status")
    query = Application.query.filter_by(user_id=g.user_id)

    if status:
        try:
            query = query.filter_by(status=ApplicationStatus(status))
        except ValueError:
            return jsonify({"error": f"Invalid status: {status}"}), 400

    applications = query.order_by(Application.applied_at.desc()).all()

    # Build pipeline summary counts
    counts = {}
    for s in ApplicationStatus:
        counts[s.value] = Application.query.filter_by(
            user_id=g.user_id, status=s
        ).count()

    # Response rate: (screening + interview + offer) / total applied
    total = counts.get("applied", 0) + counts.get("screening", 0) + \
            counts.get("interview", 0) + counts.get("offer", 0) + \
            counts.get("rejected", 0) + counts.get("withdrawn", 0)
    responded = counts.get("screening", 0) + counts.get("interview", 0) + \
                counts.get("offer", 0)
    response_rate = round((responded / total * 100) if total > 0 else 0)

    # Average AI match score
    scored = Application.query.filter(
        Application.user_id == g.user_id,
        Application.ai_match_score.isnot(None)
    ).all()
    avg_match = round(
        sum(a.ai_match_score for a in scored) / len(scored)
    ) if scored else None

    return jsonify({
        "applications": [a.to_dict() for a in applications],
        "summary": {
            "counts": counts,
            "total": total,
            "response_rate": response_rate,
            "avg_match_score": avg_match,
        }
    })


# ── POST /api/applications ─────────────────────────────────────────────────────
@applications_bp.route("/applications", methods=["POST"])
@require_auth
def create_application():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    required = ["company", "role"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    # Parse optional follow_up date
    follow_up_at = None
    if data.get("follow_up_at"):
        try:
            follow_up_at = datetime.fromisoformat(data["follow_up_at"])
        except ValueError:
            return jsonify({"error": "Invalid follow_up_at format, use ISO 8601"}), 400

    app_entry = Application(
        user_id=g.user_id,
        company=data["company"],
        role=data["role"],
        location=data.get("location"),
        job_url=data.get("job_url"),
        job_description=data.get("job_description"),
        status=ApplicationStatus(data.get("status", ApplicationStatus.APPLIED.value)),
        notes=data.get("notes"),
        follow_up_at=follow_up_at,
    )

    db.session.add(app_entry)
    db.session.commit()

    return jsonify(app_entry.to_dict()), 201


# ── GET /api/applications/<id> ─────────────────────────────────────────────────
@applications_bp.route("/applications/<int:app_id>", methods=["GET"])
@require_auth
def get_application(app_id):
    app_entry = Application.query.filter_by(id=app_id, user_id=g.user_id).first()
    if not app_entry:
        return jsonify({"error": "Application not found"}), 404
    return jsonify(app_entry.to_dict())


# ── PATCH /api/applications/<id> ──────────────────────────────────────────────
@applications_bp.route("/applications/<int:app_id>", methods=["PATCH"])
@require_auth
def update_application(app_id):
    app_entry = Application.query.filter_by(id=app_id, user_id=g.user_id).first()
    if not app_entry:
        return jsonify({"error": "Application not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    updatable = [
        "company", "role", "location", "job_url", "job_description", "notes"
    ]
    for field in updatable:
        if field in data:
            setattr(app_entry, field, data[field])

    if "status" in data:
        try:
            app_entry.status = ApplicationStatus(data["status"])
        except ValueError:
            return jsonify({"error": f"Invalid status: {data['status']}"}), 400

    if "follow_up_at" in data:
        try:
            app_entry.follow_up_at = datetime.fromisoformat(data["follow_up_at"]) \
                if data["follow_up_at"] else None
        except ValueError:
            return jsonify({"error": "Invalid follow_up_at format"}), 400

    db.session.commit()
    return jsonify(app_entry.to_dict())


# ── DELETE /api/applications/<id> ─────────────────────────────────────────────
@applications_bp.route("/applications/<int:app_id>", methods=["DELETE"])
@require_auth
def delete_application(app_id):
    app_entry = Application.query.filter_by(id=app_id, user_id=g.user_id).first()
    if not app_entry:
        return jsonify({"error": "Application not found"}), 404

    db.session.delete(app_entry)
    db.session.commit()
    return jsonify({"message": "Application deleted"}), 200


# ── POST /api/applications/<id>/analyze ───────────────────────────────────────
@applications_bp.route("/applications/<int:app_id>/analyze", methods=["POST"])
@require_auth
def analyze_application(app_id):
    app_entry = Application.query.filter_by(id=app_id, user_id=g.user_id).first()
    if not app_entry:
        return jsonify({"error": "Application not found"}), 404

    if not app_entry.job_description:
        return jsonify({"error": "No job description — add one before analyzing"}), 400

    cache_key = f"analysis:{app_id}"
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return jsonify(json.loads(cached))
    except Exception:
        pass

    from app.services.ai import analyze_match
    try:
        result = analyze_match(app_entry.job_description)
    except Exception as e:
        return jsonify({"error": f"AI analysis failed: {str(e)}"}), 502

    app_entry.ai_match_score = result["score"]
    app_entry.ai_analysis = {
        "strengths": result.get("strengths", []),
        "gaps": result.get("gaps", []),
        "keywords": result.get("keywords", []),
    }
    db.session.commit()

    response_data = app_entry.to_dict()
    try:
        redis_client.setex(cache_key, 3600, json.dumps(response_data))
    except Exception:
        pass

    return jsonify(response_data)


# ── GET /api/applications/statuses ────────────────────────────────────────────
@applications_bp.route("/applications/statuses", methods=["GET"])
@require_auth
def list_statuses():
    return jsonify({"statuses": [s.value for s in ApplicationStatus]})
