import hashlib
import secrets
from flask import Blueprint, jsonify, g
from app import db
from app.models.api_key import ApiKey
from app.middleware.auth import require_auth

keys_bp = Blueprint("keys", __name__)


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


@keys_bp.route("/keys", methods=["GET"])
@require_auth
def list_keys():
    keys = ApiKey.query.filter_by(user_id=g.user_id).order_by(ApiKey.created_at.desc()).all()
    return jsonify({"keys": [k.to_dict() for k in keys]})


@keys_bp.route("/keys", methods=["POST"])
@require_auth
def create_key():
    raw = "apk_" + secrets.token_hex(32)
    prefix = raw[:12]  # "apk_" + first 8 hex chars
    key_hash = _hash_key(raw)

    api_key = ApiKey(user_id=g.user_id, key_hash=key_hash, prefix=prefix)
    db.session.add(api_key)
    db.session.commit()

    return jsonify({"key": raw, "id": api_key.id, "prefix": prefix}), 201


@keys_bp.route("/keys/<int:key_id>", methods=["DELETE"])
@require_auth
def delete_key(key_id):
    api_key = ApiKey.query.filter_by(id=key_id, user_id=g.user_id).first()
    if not api_key:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(api_key)
    db.session.commit()
    return jsonify({"deleted": True})
