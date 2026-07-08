from tests.conftest import USER_B


def test_create_resume_from_text(client, auth_headers):
    response = client.post(
        "/api/resumes",
        json={"name": "SWE Resume", "resume_text": "Python, Flask, PostgreSQL"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["name"] == "SWE Resume"
    assert data["resume_text"] == "Python, Flask, PostgreSQL"
    assert data["s3_url"] is None  # no S3 configured in tests


def test_create_resume_requires_text_or_file(client, auth_headers):
    response = client.post("/api/resumes", json={"name": "Empty"}, headers=auth_headers)
    assert response.status_code == 400


def test_create_resume_rejects_non_pdf_upload(client, auth_headers):
    import io

    response = client.post(
        "/api/resumes",
        data={"file": (io.BytesIO(b"plain text"), "resume.txt")},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "PDF" in response.get_json()["error"]


def test_list_resumes(client, auth_headers, make_resume):
    make_resume(name="Resume A")
    make_resume(name="Resume B")
    listing = client.get("/api/resumes", headers=auth_headers).get_json()["resumes"]
    assert {r["name"] for r in listing} == {"Resume A", "Resume B"}


def test_update_resume_name_and_text(client, auth_headers, make_resume):
    resume = make_resume()
    response = client.patch(
        f"/api/resumes/{resume.id}",
        json={"name": "Renamed", "resume_text": "Updated text"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["name"] == "Renamed"
    assert data["resume_text"] == "Updated text"


def test_delete_resume(client, auth_headers, make_resume):
    resume = make_resume()
    assert client.delete(f"/api/resumes/{resume.id}", headers=auth_headers).status_code == 200
    listing = client.get("/api/resumes", headers=auth_headers).get_json()["resumes"]
    assert listing == []


def test_users_cannot_touch_each_others_resumes(client, auth_headers, make_resume):
    other = make_resume(user_id=USER_B)
    assert client.patch(
        f"/api/resumes/{other.id}", json={"name": "hijack"}, headers=auth_headers
    ).status_code == 404
    assert client.delete(f"/api/resumes/{other.id}", headers=auth_headers).status_code == 404
