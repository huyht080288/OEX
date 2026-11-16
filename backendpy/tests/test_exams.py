from datetime import datetime, timedelta, timezone

from app.seed_data import (
    SEED_ASSIGNMENT1_ID,
    SEED_CLOSED_EXAM_ID,
    SEED_DRAFT_EXAM_ID,
    SEED_PUBLISHED_EXAM_ID,
    SEED_QUESTION1_ID,
    SEED_QUESTION2_ID,
    SEED_STUDENT1_ID,
    SEED_STUDENT2_ID,
    SEED_SUBJECT_EMPTY_ID,
    SEED_SUBJECT_ID,
)
from app.utils import iso

from .conftest import auth, unique


def from_now(**delta) -> str:
    """ISO string like JS `new Date(Date.now() + delta).toISOString()`."""
    return iso(datetime.now(timezone.utc) + timedelta(**delta))


def exam_window() -> dict:
    return {"openAt": from_now(days=-7), "closeAt": from_now(days=30)}


def create_draft_exam(client, token) -> dict:
    res = client.post(
        "/api/v1/exams",
        headers=auth(token),
        json={
            "subjectId": SEED_SUBJECT_ID,
            "title": unique("Draft Exam "),
            "durationMinutes": 45,
            "maxAttempts": 1,
            **exam_window(),
        },
    )
    return res.json()["data"]


def test_lists_own_exams(client, login_as):
    res = client.get("/api/v1/exams", headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert any(e["id"] == SEED_PUBLISHED_EXAM_ID for e in res.json()["data"])


def test_creates_draft_exam(client, login_as):
    exam = create_draft_exam(client, login_as("teacher"))
    assert exam["status"] == "DRAFT"
    assert "Draft Exam" in exam["title"]


def test_get_exam_with_questions_and_assignments(client, login_as):
    res = client.get(f"/api/v1/exams/{SEED_PUBLISHED_EXAM_ID}", headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert len(res.json()["data"]["questions"]) >= 3
    assert len(res.json()["data"]["assignments"]) >= 2


def test_updates_draft_exam(client, login_as):
    token = login_as("teacher")
    exam = create_draft_exam(client, token)
    res = client.put(f"/api/v1/exams/{exam['id']}", headers=auth(token), json={"title": "Updated Draft Title"})
    assert res.status_code == 200
    assert res.json()["data"]["title"] == "Updated Draft Title"


def test_updates_valid_exam_window(client, login_as):
    token = login_as("teacher")
    exam = create_draft_exam(client, token)
    open_at, close_at = from_now(days=1), from_now(days=2)
    res = client.put(f"/api/v1/exams/{exam['id']}", headers=auth(token), json={"openAt": open_at, "closeAt": close_at})
    assert res.status_code == 200
    assert res.json()["data"]["openAt"] == open_at
    assert res.json()["data"]["closeAt"] == close_at


def test_rejects_close_before_open(client, login_as):
    token = login_as("teacher")
    exam = create_draft_exam(client, token)
    res = client.put(
        f"/api/v1/exams/{exam['id']}",
        headers=auth(token),
        json={"openAt": from_now(days=2), "closeAt": from_now(days=1)},
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"
    assert {"path": "closeAt", "message": "closeAt must be after openAt"} in res.json()["error"]["details"]


def test_cannot_update_published_exam(client, login_as):
    res = client.put(
        f"/api/v1/exams/{SEED_PUBLISHED_EXAM_ID}", headers=auth(login_as("teacher")), json={"title": "Should Fail"}
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_sets_question_order_on_draft(client, login_as):
    token = login_as("teacher")
    exam = create_draft_exam(client, token)
    res = client.put(
        f"/api/v1/exams/{exam['id']}/questions",
        headers=auth(token),
        json={"questionIds": [SEED_QUESTION2_ID, SEED_QUESTION1_ID]},
    )
    assert res.status_code == 200
    first = res.json()["data"]["questions"][0]
    assert first["question"]["id"] == SEED_QUESTION2_ID
    assert first["orderIndex"] == 1


def test_publishes_draft_with_questions(client, login_as):
    token = login_as("teacher")
    exam = create_draft_exam(client, token)
    client.put(f"/api/v1/exams/{exam['id']}/questions", headers=auth(token), json={"questionIds": [SEED_QUESTION1_ID]})
    res = client.patch(f"/api/v1/exams/{exam['id']}/status", headers=auth(token), json={"status": "PUBLISHED"})
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "PUBLISHED"


def test_cannot_publish_without_questions(client, login_as):
    token = login_as("teacher")
    created = client.post(
        "/api/v1/exams",
        headers=auth(token),
        json={"subjectId": SEED_SUBJECT_EMPTY_ID, "title": "Empty Draft", "durationMinutes": 30, **exam_window()},
    )
    res = client.patch(
        f"/api/v1/exams/{created.json()['data']['id']}/status", headers=auth(token), json={"status": "PUBLISHED"}
    )
    assert res.status_code == 400
    assert "at least one question" in res.json()["error"]["message"]


def test_closes_published_exam(client, login_as):
    token = login_as("teacher")
    exam = create_draft_exam(client, token)
    client.put(f"/api/v1/exams/{exam['id']}/questions", headers=auth(token), json={"questionIds": [SEED_QUESTION1_ID]})
    client.patch(f"/api/v1/exams/{exam['id']}/status", headers=auth(token), json={"status": "PUBLISHED"})
    res = client.patch(f"/api/v1/exams/{exam['id']}/status", headers=auth(token), json={"status": "CLOSED"})
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "CLOSED"


def test_deletes_draft(client, login_as):
    token = login_as("teacher")
    exam = create_draft_exam(client, token)
    res = client.delete(f"/api/v1/exams/{exam['id']}", headers=auth(token))
    assert res.status_code == 204


def test_cannot_delete_published_exam(client, login_as):
    res = client.delete(f"/api/v1/exams/{SEED_PUBLISHED_EXAM_ID}", headers=auth(login_as("teacher")))
    assert res.status_code == 400


def test_assigns_students(client, login_as):
    token = login_as("teacher")
    exam = create_draft_exam(client, token)
    res = client.post(f"/api/v1/exams/{exam['id']}/assignments", headers=auth(token), json={"studentIds": [SEED_STUDENT1_ID]})
    assert res.status_code == 201
    assert res.json()["data"][0]["studentId"] == SEED_STUDENT1_ID


def test_duplicate_assignment_returns_409(client, login_as):
    res = client.post(
        f"/api/v1/exams/{SEED_PUBLISHED_EXAM_ID}/assignments",
        headers=auth(login_as("teacher")),
        json={"studentIds": [SEED_STUDENT1_ID]},
    )
    assert res.status_code == 409


def test_lists_assignments(client, login_as):
    res = client.get(f"/api/v1/exams/{SEED_PUBLISHED_EXAM_ID}/assignments", headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert len(res.json()["data"]) >= 2


def test_removes_assignment(client, login_as):
    token = login_as("teacher")
    exam = create_draft_exam(client, token)
    assigned = client.post(
        f"/api/v1/exams/{exam['id']}/assignments", headers=auth(token), json={"studentIds": [SEED_STUDENT2_ID]}
    )
    assignment_id = assigned.json()["data"][0]["id"]
    res = client.delete(f"/api/v1/exams/{exam['id']}/assignments/{assignment_id}", headers=auth(token))
    assert res.status_code == 204


def test_results_summary(client, login_as):
    res = client.get(f"/api/v1/exams/{SEED_PUBLISHED_EXAM_ID}/results", headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert isinstance(res.json()["data"], list)


def test_seed_draft_exam_is_draft(client, login_as):
    res = client.get(f"/api/v1/exams/{SEED_DRAFT_EXAM_ID}", headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "DRAFT"


def test_seed_closed_exam_has_past_window(client, login_as):
    res = client.get(f"/api/v1/exams/{SEED_CLOSED_EXAM_ID}", headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "CLOSED"
    close_at = datetime.fromisoformat(res.json()["data"]["closeAt"].replace("Z", "+00:00"))
    assert close_at < datetime.now(timezone.utc)


def test_assignments_include_seed_assignment(client, login_as):
    res = client.get(f"/api/v1/exams/{SEED_PUBLISHED_EXAM_ID}/assignments", headers=auth(login_as("teacher")))
    assert any(a["id"] == SEED_ASSIGNMENT1_ID for a in res.json()["data"])
