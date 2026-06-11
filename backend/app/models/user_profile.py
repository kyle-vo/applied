from app import db
from datetime import datetime, timezone


class UserProfile(db.Model):
    __tablename__ = "user_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, unique=True, index=True)
    resume_text = db.Column(db.Text)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "resume_text": self.resume_text,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
