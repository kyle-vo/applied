from app import db
from datetime import datetime, timezone


class ApiKey(db.Model):
    __tablename__ = "api_keys"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, index=True)
    key_hash = db.Column(db.String(64), nullable=False, unique=True)
    prefix = db.Column(db.String(12), nullable=False)  # "apk_" + first 8 hex chars
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "prefix": self.prefix,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
