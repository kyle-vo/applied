from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app import db
from app.models.api_key import ApiKey
from app.models.application import Application
from app.models.resume import Resume
from app.services.demo import DEMO_APPLICATIONS, DEMO_USER_PREFIX


def _start_demo(client):
    response = client.post("/api/demo/start")
    assert response.status_code == 201
    return response.get_json()


def test_start_demo_returns_working_key(client):
    key = _start_demo(client)["key"]
    assert key.startswith("apk_")

    response = client.get("/api/applications", headers={"X-API-Key": key})
    assert response.status_code == 200


def test_demo_account_is_seeded(client):
    key = _start_demo(client)["key"]
    headers = {"X-API-Key": key}

    data = client.get("/api/applications", headers=headers).get_json()
    assert len(data["applications"]) == len(DEMO_APPLICATIONS)
    assert data["summary"]["counts"]["offer"] == 1
    assert data["summary"]["avg_match_score"] is not None
    # At least one seeded application ships with a full AI analysis
    assert any(a["ai_analysis"] for a in data["applications"])

    resumes = client.get("/api/resumes", headers=headers).get_json()["resumes"]
    assert len(resumes) == 1


def test_each_demo_session_is_isolated(client):
    key_one = _start_demo(client)["key"]
    key_two = _start_demo(client)["key"]
    assert key_one != key_two

    headers = {"X-API-Key": key_one}
    created = client.post(
        "/api/applications",
        json={"company": "OnlyInSessionOne", "role": "SWE"},
        headers=headers,
    )
    assert created.status_code == 201

    other = client.get("/api/applications", headers={"X-API-Key": key_two}).get_json()
    assert all(a["company"] != "OnlyInSessionOne" for a in other["applications"])


def test_demo_analyze_never_calls_claude(client):
    key = _start_demo(client)["key"]
    headers = {"X-API-Key": key}

    apps = client.get("/api/applications", headers=headers).get_json()["applications"]
    target = next(a for a in apps if a["job_description"])

    with patch("app.services.ai.analyze_match") as mock_ai:
        response = client.post(
            f"/api/applications/{target['id']}/analyze?force=true", headers=headers
        )

    assert response.status_code == 200
    mock_ai.assert_not_called()
    data = response.get_json()
    assert 0 <= data["ai_match_score"] <= 100
    assert data["ai_analysis"]["strengths"]


def test_demo_tailor_never_calls_claude(client):
    key = _start_demo(client)["key"]
    headers = {"X-API-Key": key}

    apps = client.get("/api/applications", headers=headers).get_json()["applications"]
    target = next(a for a in apps if a["job_description"])

    with patch("app.services.ai.tailor_resume") as mock_ai:
        response = client.post(
            f"/api/applications/{target['id']}/tailor?force=true", headers=headers
        )

    assert response.status_code == 200
    mock_ai.assert_not_called()
    assert response.get_json()["ai_tailor"]["tailored_summary"]


def test_expired_demo_accounts_are_cleaned_up(client, app):
    old_key = _start_demo(client)["key"]

    # Backdate every ApiKey for the first demo user past the 24h TTL
    old_api_key = ApiKey.query.filter(ApiKey.user_id.like(DEMO_USER_PREFIX + "%")).one()
    old_user_id = old_api_key.user_id
    old_api_key.created_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=25)
    db.session.commit()

    # Starting a new demo runs lazy cleanup of expired ones
    _start_demo(client)

    assert client.get("/api/applications", headers={"X-API-Key": old_key}).status_code == 401
    assert Application.query.filter_by(user_id=old_user_id).count() == 0
    assert Resume.query.filter_by(user_id=old_user_id).count() == 0


def test_fresh_demo_accounts_survive_cleanup(client):
    key = _start_demo(client)["key"]
    _start_demo(client)  # triggers cleanup pass

    assert client.get("/api/applications", headers={"X-API-Key": key}).status_code == 200
