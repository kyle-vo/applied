import io
from flask import Blueprint, request, jsonify, g
from app import db
from app.models.user_profile import UserProfile
from app.middleware.auth import require_auth

settings_bp = Blueprint("settings", __name__)


@settings_bp.route("/settings/resume", methods=["GET"])
@require_auth
def get_resume():
    profile = UserProfile.query.filter_by(user_id=g.user_id).first()
    return jsonify({"resume_text": profile.resume_text if profile else None})


@settings_bp.route("/settings/resume", methods=["POST"])
@require_auth
def save_resume():
    if "file" in request.files:
        file = request.files["file"]
        if not file.filename.lower().endswith(".pdf"):
            return jsonify({"error": "Only PDF files are supported"}), 400
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file.read()))
            resume_text = "\n".join(
                page.extract_text() or "" for page in reader.pages
            ).strip()
        except Exception as e:
            return jsonify({"error": f"Failed to read PDF: {str(e)}"}), 422
    else:
        data = request.get_json()
        if not data or not data.get("resume_text", "").strip():
            return jsonify({"error": "resume_text is required"}), 400
        resume_text = data["resume_text"].strip()

    profile = UserProfile.query.filter_by(user_id=g.user_id).first()
    if profile:
        profile.resume_text = resume_text
    else:
        profile = UserProfile(user_id=g.user_id, resume_text=resume_text)
        db.session.add(profile)
    db.session.commit()

    return jsonify({"resume_text": resume_text})
