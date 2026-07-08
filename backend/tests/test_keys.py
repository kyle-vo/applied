def test_create_key_returns_raw_key_once(client, auth_headers):
    response = client.post("/api/keys", headers=auth_headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data["key"].startswith("apk_")
    assert data["prefix"] == data["key"][:12]

    # Listing never exposes the raw key or its hash — only the prefix
    listing = client.get("/api/keys", headers=auth_headers).get_json()["keys"]
    assert len(listing) == 2  # the fixture key + the new one
    for key in listing:
        assert set(key.keys()) == {"id", "prefix", "created_at"}


def test_generated_key_authenticates(client, auth_headers):
    raw = client.post("/api/keys", headers=auth_headers).get_json()["key"]
    response = client.get("/api/applications", headers={"X-API-Key": raw})
    assert response.status_code == 200


def test_revoked_key_stops_working(client, auth_headers):
    created = client.post("/api/keys", headers=auth_headers).get_json()

    assert client.delete(f"/api/keys/{created['id']}", headers=auth_headers).status_code == 200
    response = client.get("/api/applications", headers={"X-API-Key": created["key"]})
    assert response.status_code == 401


def test_cannot_revoke_another_users_key(client, auth_headers, auth_headers_b):
    created = client.post("/api/keys", headers=auth_headers_b).get_json()
    response = client.delete(f"/api/keys/{created['id']}", headers=auth_headers)
    assert response.status_code == 404


def test_users_only_see_their_own_keys(client, auth_headers, auth_headers_b):
    client.post("/api/keys", headers=auth_headers_b)
    listing = client.get("/api/keys", headers=auth_headers).get_json()["keys"]
    assert len(listing) == 1  # only user A's fixture key
