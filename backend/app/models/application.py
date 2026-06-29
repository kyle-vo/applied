from app import db
from datetime import datetime, timezone
import enum


class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class Application(db.Model):
    __tablename__ = "applications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, index=True)  # Clerk user ID

    # Job details
    company = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(255))
    job_url = db.Column(db.Text)
    job_description = db.Column(db.Text)

    # Status
    status = db.Column(
        db.Enum(ApplicationStatus),
        nullable=False,
        default=ApplicationStatus.APPLIED
    )

    # AI analysis
    ai_match_score = db.Column(db.Integer)       # 0-100
    ai_analysis = db.Column(db.JSON)             # {strengths: [], gaps: [], keywords: []}
    ai_tailor = db.Column(db.JSON)               # {tailored_summary, rewrites[], keywords_to_add[]}
    analysis_hash = db.Column(db.String(64))     # sha256(resume_text + job_description)
    tailor_hash = db.Column(db.String(64))       # sha256(resume_text + job_description)

    # Dates
    applied_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    follow_up_at = db.Column(db.DateTime)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Notes
    notes = db.Column(db.Text)

    def to_dict(self):
        return {
            "id": self.id,
            "company": self.company,
            "role": self.role,
            "location": self.location,
            "job_url": self.job_url,
            "job_description": self.job_description,
            "status": self.status.value,
            "ai_match_score": self.ai_match_score,
            "ai_analysis": self.ai_analysis,
            "ai_tailor": self.ai_tailor,
            "applied_at": self.applied_at.isoformat() + "Z" if self.applied_at else None,
            "follow_up_at": self.follow_up_at.isoformat() + "Z" if self.follow_up_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
            "notes": self.notes,
        }
