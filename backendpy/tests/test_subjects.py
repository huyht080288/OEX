from app.seed_data import SEED_SUBJECT2_ID, SEED_SUBJECT_EMPTY_ID, SEED_SUBJECT_ID

from .conftest import auth, unique


def test_lists_own_subjects(client, login_as):
    res = client.get("/api/v1/subjects", headers=auth(login_as("teacher")))
    data = res.json()["data"]
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert any(s["id"] == SEED_SUBJECT_ID for s in data)
    assert any(s["id"] == SEED_SUBJECT_EMPTY_ID for s in data)


def test_creates_subject(client, login_as):
    code = unique("SUB")
    res = client.post(
        "/api/v1/subjects", headers=auth(login_as("teacher")), json={"code": code, "name": "New Subject", "description": "Test"}
    )
    assert res.status_code == 201
    assert res.json()["data"]["code"] == code
    assert res.json()["data"]["name"] == "New Subject"


def test_get_subject(client, login_as):
    res = client.get(f"/api/v1/subjects/{SEED_SUBJECT_ID}", headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert res.json()["data"]["code"] == "CS101"


def test_update_subject(client, login_as):
    res = client.put(
        f"/api/v1/subjects/{SEED_SUBJECT_EMPTY_ID}",
        headers=auth(login_as("teacher")),
        json={"name": "Renamed Empty Subject"},
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Renamed Empty Subject"


def test_delete_empty_subject(client, login_as):
    token = login_as("teacher")
    created = client.post("/api/v1/subjects", headers=auth(token), json={"code": unique("DEL"), "name": "To Delete"})
    res = client.delete(f"/api/v1/subjects/{created.json()['data']['id']}", headers=auth(token))
    assert res.status_code == 204


def test_delete_subject_blocked_when_questions_exist(client, login_as):
    res = client.delete(f"/api/v1/subjects/{SEED_SUBJECT_ID}", headers=auth(login_as("teacher")))
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_other_teacher_forbidden(client, login_as):
    res = client.get(f"/api/v1/subjects/{SEED_SUBJECT_ID}", headers=auth(login_as("teacher2")))
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_teacher2_can_access_own_subject(client, login_as):
    res = client.get(f"/api/v1/subjects/{SEED_SUBJECT2_ID}", headers=auth(login_as("teacher2")))
    assert res.status_code == 200
    assert res.json()["data"]["code"] == "MATH101"


def test_subjects_forbidden_for_student(client, login_as):
    res = client.get("/api/v1/subjects", headers=auth(login_as("student1")))
    assert res.status_code == 403
