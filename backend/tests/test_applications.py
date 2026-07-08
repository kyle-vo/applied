from tests.conftest import USER_B


def _create(client, headers, **overrides):
    body = {"company": "Acme Corp", "role": "Software Engineer", **overrides}
    return client.post("/api/applications", json=body, headers=headers)


# ── Create ─────────────────────────────────────────────────────────────────────

def test_create_application(client, auth_headers):
    response = _create(client, auth_headers, location="Remote", notes="via referral")
    assert response.status_code == 201
    data = response.get_json()
    assert data["company"] == "Acme Corp"
    assert data["role"] == "Software Engineer"
    assert data["location"] == "Remote"
    assert data["status"] == "applied"
    assert data["applied_at"] is not None


def test_create_requires_company_and_role(client, auth_headers):
    response = client.post("/api/applications", json={"company": "Acme Corp"}, headers=auth_headers)
    assert response.status_code == 400
    assert "role" in response.get_json()["error"]


def test_create_rejects_empty_body(client, auth_headers):
    response = client.post("/api/applications", json={}, headers=auth_headers)
    assert response.status_code == 400


def test_create_duplicate_is_rejected_case_insensitively(client, auth_headers):
    assert _create(client, auth_headers).status_code == 201
    response = _create(client, auth_headers, company="ACME CORP", role="software engineer")
    assert response.status_code == 409
    assert response.get_json()["duplicate"] is True


def test_create_duplicate_allowed_with_force(client, auth_headers):
    assert _create(client, auth_headers).status_code == 201
    response = client.post(
        "/api/applications?force=true",
        json={"company": "Acme Corp", "role": "Software Engineer"},
        headers=auth_headers,
    )
    assert response.status_code == 201


def test_create_with_invalid_follow_up_date(client, auth_headers):
    response = _create(client, auth_headers, follow_up_at="next tuesday")
    assert response.status_code == 400


# ── List + summary ─────────────────────────────────────────────────────────────

def test_list_returns_applications_and_summary(client, auth_headers):
    _create(client, auth_headers)
    _create(client, auth_headers, company="Globex", role="Backend Engineer", status="interview")

    response = client.get("/api/applications", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["applications"]) == 2
    assert data["summary"]["total"] == 2
    assert data["summary"]["counts"]["applied"] == 1
    assert data["summary"]["counts"]["interview"] == 1
    # 1 of 2 applications got a response (interview) → 50%
    assert data["summary"]["response_rate"] == 50


def test_list_filters_by_status(client, auth_headers):
    _create(client, auth_headers)
    _create(client, auth_headers, company="Globex", role="Backend Engineer", status="offer")

    response = client.get("/api/applications?status=offer", headers=auth_headers)
    applications = response.get_json()["applications"]
    assert len(applications) == 1
    assert applications[0]["company"] == "Globex"


def test_list_rejects_invalid_status_filter(client, auth_headers):
    response = client.get("/api/applications?status=ghosted", headers=auth_headers)
    assert response.status_code == 400


def test_list_statuses(client, auth_headers):
    response = client.get("/api/applications/statuses", headers=auth_headers)
    assert response.status_code == 200
    assert "applied" in response.get_json()["statuses"]


# ── Get / update / delete ──────────────────────────────────────────────────────

def test_get_single_application(client, auth_headers):
    app_id = _create(client, auth_headers).get_json()["id"]
    response = client.get(f"/api/applications/{app_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.get_json()["id"] == app_id


def test_get_missing_application_returns_404(client, auth_headers):
    response = client.get("/api/applications/9999", headers=auth_headers)
    assert response.status_code == 404


def test_update_fields_and_status(client, auth_headers):
    app_id = _create(client, auth_headers).get_json()["id"]
    response = client.patch(
        f"/api/applications/{app_id}",
        json={"status": "interview", "notes": "phone screen booked"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "interview"
    assert data["notes"] == "phone screen booked"


def test_update_rejects_invalid_status(client, auth_headers):
    app_id = _create(client, auth_headers).get_json()["id"]
    response = client.patch(
        f"/api/applications/{app_id}", json={"status": "ghosted"}, headers=auth_headers
    )
    assert response.status_code == 400


def test_update_can_clear_follow_up_date(client, auth_headers):
    app_id = _create(client, auth_headers, follow_up_at="2026-08-01T00:00:00").get_json()["id"]
    response = client.patch(
        f"/api/applications/{app_id}", json={"follow_up_at": None}, headers=auth_headers
    )
    assert response.status_code == 200
    assert response.get_json()["follow_up_at"] is None


def test_delete_application(client, auth_headers):
    app_id = _create(client, auth_headers).get_json()["id"]
    assert client.delete(f"/api/applications/{app_id}", headers=auth_headers).status_code == 200
    assert client.get(f"/api/applications/{app_id}", headers=auth_headers).status_code == 404


# ── User isolation ─────────────────────────────────────────────────────────────

def test_users_cannot_see_each_others_applications(client, auth_headers, auth_headers_b, make_application):
    other = make_application(user_id=USER_B, company="SecretCo")

    listing = client.get("/api/applications", headers=auth_headers).get_json()
    assert listing["applications"] == []

    assert client.get(f"/api/applications/{other.id}", headers=auth_headers).status_code == 404
    assert client.patch(
        f"/api/applications/{other.id}", json={"notes": "hijack"}, headers=auth_headers
    ).status_code == 404
    assert client.delete(f"/api/applications/{other.id}", headers=auth_headers).status_code == 404

    # The owner still sees it
    assert client.get(f"/api/applications/{other.id}", headers=auth_headers_b).status_code == 200
