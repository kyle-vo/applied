import io
import os
import uuid
import boto3
from botocore.exceptions import ClientError
from flask import Blueprint, request, jsonify, g
from app import db
from app.models.resume import Resume
from app.middleware.auth import require_auth

resumes_bp = Blueprint("resumes", __name__)

_s3 = None

def get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
        )
    return _s3

S3_BUCKET = os.environ.get("AWS_S3_BUCKET", "")
PRESIGN_EXPIRY = 900  # 15 minutes


def presign(s3_key: str) -> str | None:
    if not S3_BUCKET or not s3_key:
        return None
    try:
        return get_s3().generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": s3_key},
            ExpiresIn=PRESIGN_EXPIRY,
        )
    except ClientError:
        return None


def upload_pdf(file_bytes: bytes, user_id: str) -> str:
    key = f"resumes/{user_id}/{uuid.uuid4()}.pdf"
    get_s3().put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=file_bytes,
        ContentType="application/pdf",
    )
    return key


def delete_s3_object(s3_key: str) -> None:
    if not S3_BUCKET or not s3_key:
        return
    try:
        get_s3().delete_object(Bucket=S3_BUCKET, Key=s3_key)
    except ClientError:
        pass


@resumes_bp.route("/resumes", methods=["GET"])
@require_auth
def list_resumes():
    resumes = Resume.query.filter_by(user_id=g.user_id).order_by(Resume.created_at.desc()).all()
    return jsonify({"resumes": [r.to_dict(presign(r.s3_key)) for r in resumes]})


@resumes_bp.route("/resumes", methods=["POST"])
@require_auth
def create_resume():
    name = request.form.get("name") or (request.get_json(silent=True) or {}).get("name", "My Resume")
    s3_key = None

    if "file" in request.files:
        file = request.files["file"]
        if not file.filename.lower().endswith(".pdf"):
            return jsonify({"error": "Only PDF files are supported"}), 400
        file_bytes = file.read()
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            resume_text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        except Exception as e:
            return jsonify({"error": f"Failed to read PDF: {str(e)}"}), 422

        if S3_BUCKET:
            try:
                s3_key = upload_pdf(file_bytes, g.user_id)
            except ClientError as e:
                return jsonify({"error": f"S3 upload failed: {str(e)}"}), 500
    else:
        data = request.get_json(silent=True) or {}
        resume_text = data.get("resume_text", "").strip()
        if not resume_text:
            return jsonify({"error": "resume_text or file is required"}), 400
        name = data.get("name", "My Resume")

    resume = Resume(user_id=g.user_id, name=name, resume_text=resume_text, s3_key=s3_key)
    db.session.add(resume)
    db.session.commit()
    return jsonify(resume.to_dict(presign(s3_key))), 201


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
    return jsonify(resume.to_dict(presign(resume.s3_key)))


@resumes_bp.route("/resumes/<int:resume_id>", methods=["DELETE"])
@require_auth
def delete_resume(resume_id):
    resume = Resume.query.filter_by(id=resume_id, user_id=g.user_id).first()
    if not resume:
        return jsonify({"error": "Resume not found"}), 404
    if resume.s3_key:
        delete_s3_object(resume.s3_key)
    db.session.delete(resume)
    db.session.commit()
    return jsonify({"message": "Resume deleted"}), 200
