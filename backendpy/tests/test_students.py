from app.seed_data import SEED_STUDENT1_ID, SEED_STUDENT2_ID

from .conftest import auth


def test_lists_active_students(client, login_as):
    res = client.get("/api/v1/students", headers=auth(login_as("teacher")))
    data = res.json()["data"]
    assert res.status_code == 200
    assert any(s["id"] == SEED_STUDENT1_ID for s in data)
    assert any(s["id"] == SEED_STUDENT2_ID for s in data)


def test_search_students_by_email(client, login_as):
    res = client.get("/api/v1/students", params={"search": "student1@oex.test"}, headers=auth(login_as("teacher")))
    data = res.json()["data"]
    assert res.status_code == 200
    assert len(data) == 1
    assert data[0]["email"] == "student1@oex.test"


def test_students_forbidden_for_student(client, login_as):
    res = client.get("/api/v1/students", headers=auth(login_as("student1")))
    assert res.status_code == 403
