import io
from flask import Blueprint, request, jsonify, g
from app import db
from app.models.resume import Resume
from app.middleware.auth import require_auth

resumes_bp = Blueprint("resumes", __name__)


@resumes_bp.route("/resumes", methods=["GET"])
@require_auth
def list_resumes():
    resumes = Resume.query.filter_by(user_id=g.user_id).order_by(Resume.created_at.desc()).all()
    return jsonify({"resumes": [r.to_dict() for r in resumes]})


@resumes_bp.route("/resumes", methods=["POST"])
@require_auth
def create_resume():
    name = request.form.get("name") or (request.get_json(silent=True) or {}).get("name", "My Resume")

    if "file" in request.files:
        file = request.files["file"]
        if not file.filename.lower().endswith(".pdf"):
            return jsonify({"error": "Only PDF files are supported"}), 400
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file.read()))
            resume_text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        except Exception as e:
            return jsonify({"error": f"Failed to read PDF: {str(e)}"}), 422
    else:
        data = request.get_json(silent=True) or {}
        resume_text = data.get("resume_text", "").strip()
        if not resume_text:
            return jsonify({"error": "resume_text or file is required"}), 400
        name = data.get("name", "My Resume")

    resume = Resume(user_id=g.user_id, name=name, resume_text=resume_text)
    db.session.add(resume)
    db.session.commit()
    return jsonify(resume.to_dict()), 201


@resumes_bp.route("/resumes/<int:resume_id>", methods=["PATCH"])
@require_auth
def update_resume(resume_id):
    resume = Resume.query.filter_by(id=resume_id, user_id=g.user_id).first()
    if not resume:
        return jsonify({"error": "Resume not found"}), 404
    data = request.get_json()
    if "name" in data:
        resume.name = data["name"].strip() or resume.name
    if "resume_text" in data:
        resume.resume_text = data["resume_text"].strip() or resume.resume_text
    db.session.commit()
    return jsonify(resume.to_dict())


@resumes_bp.route("/resumes/<int:resume_id>", methods=["DELETE"])
@require_auth
def delete_resume(resume_id):
    resume = Resume.query.filter_by(id=resume_id, user_id=g.user_id).first()
    if not resume:
        return jsonify({"error": "Resume not found"}), 404
    db.session.delete(resume)
    db.session.commit()
    return jsonify({"message": "Resume deleted"}), 200
