from tests.conftest import KEY_A


def test_request_without_credentials_is_rejected(client):
    response = client.get("/api/applications")
    assert response.status_code == 401


def test_invalid_api_key_is_rejected(client, auth_headers):
    response = client.get("/api/applications", headers={"X-API-Key": "apk_" + "f" * 64})
    assert response.status_code == 401
    assert response.get_json()["error"] == "Invalid API key"


def test_malformed_authorization_header_is_rejected(client):
    response = client.get("/api/applications", headers={"Authorization": "Basic abc123"})
    assert response.status_code == 401


def test_garbage_bearer_token_is_rejected(client):
    response = client.get("/api/applications", headers={"Authorization": "Bearer not.a.jwt"})
    assert response.status_code == 401


def test_valid_api_key_is_accepted(client, auth_headers):
    response = client.get("/api/applications", headers=auth_headers)
    assert response.status_code == 200


def test_api_key_takes_precedence_over_bearer(client, auth_headers):
    headers = {**auth_headers, "Authorization": "Bearer not.a.jwt"}
    response = client.get("/api/applications", headers=headers)
    assert response.status_code == 200
