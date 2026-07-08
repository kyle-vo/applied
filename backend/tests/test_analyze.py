from unittest.mock import patch

FAKE_ANALYSIS = {
    "score": 72,
    "strengths": ["Flask experience", "PostgreSQL"],
    "gaps": ["No professional experience"],
    "keywords": ["Python", "Flask", "REST"],
}


def test_analyze_requires_job_description(client, auth_headers, make_application, make_resume):
    application = make_application(job_description=None)
    make_resume()
    response = client.post(f"/api/applications/{application.id}/analyze", headers=auth_headers)
    assert response.status_code == 400
    assert "job description" in response.get_json()["error"].lower()


def test_analyze_requires_a_resume(client, auth_headers, make_application):
    application = make_application(job_description="Python developer needed")
    response = client.post(f"/api/applications/{application.id}/analyze", headers=auth_headers)
    assert response.status_code == 400
    assert "resume" in response.get_json()["error"].lower()


def test_analyze_scores_and_persists(client, auth_headers, make_application, make_resume):
    application = make_application(job_description="Python developer needed")
    make_resume()

    with patch("app.services.ai.analyze_match", return_value=FAKE_ANALYSIS) as mock_ai:
        response = client.post(f"/api/applications/{application.id}/analyze", headers=auth_headers)

    assert response.status_code == 200
    data = response.get_json()
    assert data["ai_match_score"] == 72
    assert data["ai_analysis"]["strengths"] == ["Flask experience", "PostgreSQL"]
    mock_ai.assert_called_once()

    # Score survives a plain re-fetch
    refetched = client.get(f"/api/applications/{application.id}", headers=auth_headers).get_json()
    assert refetched["ai_match_score"] == 72


def test_analyze_skips_ai_when_content_unchanged(client, auth_headers, make_application, make_resume):
    application = make_application(job_description="Python developer needed")
    make_resume()

    with patch("app.services.ai.analyze_match", return_value=FAKE_ANALYSIS) as mock_ai:
        client.post(f"/api/applications/{application.id}/analyze", headers=auth_headers)
        response = client.post(f"/api/applications/{application.id}/analyze", headers=auth_headers)

    assert response.status_code == 200
    assert mock_ai.call_count == 1  # second call served from the stored hash


def test_analyze_reruns_when_job_description_changes(client, auth_headers, make_application, make_resume):
    application = make_application(job_description="Python developer needed")
    make_resume()

    with patch("app.services.ai.analyze_match", return_value=FAKE_ANALYSIS) as mock_ai:
        client.post(f"/api/applications/{application.id}/analyze", headers=auth_headers)
        client.patch(
            f"/api/applications/{application.id}",
            json={"job_description": "Senior Rust engineer"},
            headers=auth_headers,
        )
        client.post(f"/api/applications/{application.id}/analyze", headers=auth_headers)

    assert mock_ai.call_count == 2


def test_analyze_force_bypasses_dedup(client, auth_headers, make_application, make_resume):
    application = make_application(job_description="Python developer needed")
    make_resume()

    with patch("app.services.ai.analyze_match", return_value=FAKE_ANALYSIS) as mock_ai:
        client.post(f"/api/applications/{application.id}/analyze", headers=auth_headers)
        client.post(f"/api/applications/{application.id}/analyze?force=true", headers=auth_headers)

    assert mock_ai.call_count == 2


def test_analyze_returns_502_when_ai_fails(client, auth_headers, make_application, make_resume):
    application = make_application(job_description="Python developer needed")
    make_resume()

    with patch("app.services.ai.analyze_match", side_effect=RuntimeError("API down")):
        response = client.post(f"/api/applications/{application.id}/analyze", headers=auth_headers)

    assert response.status_code == 502
    assert "AI analysis failed" in response.get_json()["error"]


def test_analyze_missing_application_returns_404(client, auth_headers):
    response = client.post("/api/applications/9999/analyze", headers=auth_headers)
    assert response.status_code == 404
