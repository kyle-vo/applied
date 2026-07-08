import hashlib
import os

# Must be set before importing the app factory — create_app reads DATABASE_URL
# at import/config time. "sqlite://" is an in-memory database, so tests never
# touch the real Postgres instance.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ANTHROPIC_API_KEY"] = "test-key-not-real"

import pytest

from app import create_app, db
from app.models.api_key import ApiKey
from app.models.application import Application, ApplicationStatus
from app.models.resume import Resume

# Raw API keys used by the auth fixtures. Tests authenticate through the real
# X-API-Key middleware path rather than mocking @require_auth.
USER_A = "user_test_a"
USER_B = "user_test_b"
KEY_A = "apk_" + "a" * 64
KEY_B = "apk_" + "b" * 64


@pytest.fixture()
def app():
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def _register_key(user_id: str, raw_key: str):
    db.session.add(
        ApiKey(
            user_id=user_id,
            key_hash=hashlib.sha256(raw_key.encode()).hexdigest(),
            prefix=raw_key[:12],
        )
    )
    db.session.commit()


@pytest.fixture()
def auth_headers(app):
    _register_key(USER_A, KEY_A)
    return {"X-API-Key": KEY_A}


@pytest.fixture()
def auth_headers_b(app):
    _register_key(USER_B, KEY_B)
    return {"X-API-Key": KEY_B}


@pytest.fixture()
def make_application(app):
    def _make(user_id=USER_A, **overrides):
        fields = {
            "company": "Acme Corp",
            "role": "Software Engineer",
            "status": ApplicationStatus.APPLIED,
            **overrides,
        }
        application = Application(user_id=user_id, **fields)
        db.session.add(application)
        db.session.commit()
        return application

    return _make


@pytest.fixture()
def make_resume(app):
    def _make(user_id=USER_A, **overrides):
        fields = {
            "name": "Test Resume",
            "resume_text": "Python, Flask, PostgreSQL. BS in Computer Science.",
            **overrides,
        }
        resume = Resume(user_id=user_id, **fields)
        db.session.add(resume)
        db.session.commit()
        return resume

    return _make
