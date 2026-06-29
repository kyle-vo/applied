from app import db
from datetime import datetime, timezone


class Resume(db.Model):
    __tablename__ = "resumes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, default="My Resume")
    resume_text = db.Column(db.Text, nullable=False)
    s3_key = db.Column(db.String(512), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self, s3_url: str | None = None):
        return {
            "id": self.id,
            "name": self.name,
            "resume_text": self.resume_text,
            "s3_url": s3_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
