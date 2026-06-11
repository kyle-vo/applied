from flask import Blueprint, jsonify
from app import db, redis_client

health_bp = Blueprint("health", __name__)


@health_bp.route("/health")
def health():
    status = {"api": "ok", "db": "ok", "redis": "ok"}
    http_status = 200

    try:
        db.session.execute(db.text("SELECT 1"))
    except Exception as e:
        status["db"] = str(e)
        http_status = 503

    try:
        redis_client.ping()
    except Exception as e:
        status["redis"] = str(e)
        http_status = 503

    return jsonify(status), http_status
