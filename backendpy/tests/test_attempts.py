"""Student exam taking. Tests in this module run in order and share attempt state."""

import pytest

from app.seed_data import (
    SEED_ASSIGNMENT1_ID,
    SEED_ASSIGNMENT2_ID,
    SEED_ASSIGNMENT_CLOSED_ID,
    SEED_ATTEMPT_EXPIRED_ID,
    SEED_ATTEMPT_SUBMITTED_ID,
    SEED_PUBLISHED_EXAM_ID,
    SEED_Q1_OPT_B_ID,
    SEED_Q2_OPT_B_ID,
    SEED_Q3_OPT_B_ID,
    SEED_QUESTION1_ID,
    SEED_QUESTION2_ID,
    SEED_QUESTION3_ID,
    SEED_STUDENT2_ID,
)

from .conftest import auth
from .db_helpers import reset_seed_assignment_attempts, set_attempt_expired

ALL_CORRECT = [
    {"questionId": SEED_QUESTION1_ID, "selectedOptionId": SEED_Q1_OPT_B_ID},
    {"questionId": SEED_QUESTION2_ID, "selectedOptionId": SEED_Q2_OPT_B_ID},
    {"questionId": SEED_QUESTION3_ID, "selectedOptionId": SEED_Q3_OPT_B_ID},
]


@pytest.fixture(scope="module", autouse=True)
def _reset_attempts(database_url):
    reset_seed_assignment_attempts()


def start(client, token, assignment_id):
    return client.post("/api/v1/attempts/start", headers=auth(token), json={"assignmentId": assignment_id})


def published_entry(client, token) -> dict:
    res = client.get("/api/v1/my-exams", headers=auth(token))
    return next(a for a in res.json()["data"] if a["exam"]["id"] == SEED_PUBLISHED_EXAM_ID)


# ---- GET /my-exams


def test_my_exams_returns_assigned_exams(client, login_as):
    entry = published_entry(client, login_as("student1"))
    assert entry["assignmentId"] == SEED_ASSIGNMENT1_ID
    assert entry["maxAttempts"] == 2
    assert entry["attemptCount"] >= 1


def test_my_exams_forbidden_for_teacher(client, login_as):
    assert client.get("/api/v1/my-exams", headers=auth(login_as("teacher"))).status_code == 403


# ---- POST /attempts/start


def test_start_attempt_omits_is_correct(client, login_as):
    res = start(client, login_as("student1"), SEED_ASSIGNMENT1_ID)
    assert res.status_code == 201
    questions = res.json()["data"]["questions"]
    assert len(questions) >= 3
    for q in questions:
        for opt in q["options"]:
            assert "isCorrect" not in opt


def test_start_rejects_when_in_progress(client, login_as):
    res = start(client, login_as("student1"), SEED_ASSIGNMENT1_ID)
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "ATTEMPT_IN_PROGRESS"


def test_start_rejects_closed_exam(client, login_as):
    res = start(client, login_as("student1"), SEED_ASSIGNMENT_CLOSED_ID)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "EXAM_NOT_AVAILABLE"


def test_start_rejects_other_student_assignment(client, login_as):
    res = start(client, login_as("student1"), SEED_ASSIGNMENT2_ID)
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


# ---- GET /attempts/:id


def test_get_in_progress_attempt_without_answer_leak(client, login_as):
    token = login_as("student1")
    attempt_id = published_entry(client, token)["inProgressAttemptId"]
    res = client.get(f"/api/v1/attempts/{attempt_id}", headers=auth(token))
    assert res.status_code == 200
    assert "isCorrect" not in res.json()["data"]["questions"][0]["options"][0]


# ---- PUT answers + submit


def test_save_submit_score_and_double_submit(client, login_as):
    token = login_as("student1")
    attempt_id = published_entry(client, token)["inProgressAttemptId"]

    saved = client.put(f"/api/v1/attempts/{attempt_id}/answers", headers=auth(token), json={"answers": ALL_CORRECT})
    assert saved.status_code == 200
    assert saved.json()["data"]["answers"][SEED_QUESTION1_ID] == SEED_Q1_OPT_B_ID

    submitted = client.post(f"/api/v1/attempts/{attempt_id}/submit", headers=auth(token))
    data = submitted.json()["data"]
    assert submitted.status_code == 200
    assert data["score"] == 4
    assert data["maxScore"] == 4
    assert data["correctCount"] == 3
    assert len(data["review"]) == 3

    again = client.post(f"/api/v1/attempts/{attempt_id}/submit", headers=auth(token))
    assert again.status_code == 409


def test_save_rejected_after_expiry(client, login_as):
    token = login_as("student2")
    attempt_id = start(client, token, SEED_ASSIGNMENT2_ID).json()["data"]["attemptId"]
    set_attempt_expired(attempt_id)

    res = client.put(
        f"/api/v1/attempts/{attempt_id}/answers",
        headers=auth(token),
        json={"answers": [{"questionId": SEED_QUESTION1_ID, "selectedOptionId": SEED_Q1_OPT_B_ID}]},
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "ATTEMPT_EXPIRED"


# ---- GET /attempts/:id/result


def test_seed_submitted_result_with_review(client, login_as):
    res = client.get(f"/api/v1/attempts/{SEED_ATTEMPT_SUBMITTED_ID}/result", headers=auth(login_as("student2")))
    data = res.json()["data"]
    assert res.status_code == 200
    assert data["score"] == 2
    assert data["maxScore"] == 4
    assert data["status"] == "SUBMITTED"
    assert len(data["review"]) == 3


def test_expired_result_for_student1(client, login_as):
    res = client.get(f"/api/v1/attempts/{SEED_ATTEMPT_EXPIRED_ID}/result", headers=auth(login_as("student1")))
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "EXPIRED"
    assert res.json()["data"]["score"] == 1


def test_get_rejects_non_in_progress_attempt(client, login_as):
    res = client.get(f"/api/v1/attempts/{SEED_ATTEMPT_SUBMITTED_ID}", headers=auth(login_as("student2")))
    assert res.status_code == 400


def test_result_forbidden_for_other_student(client, login_as):
    res = client.get(f"/api/v1/attempts/{SEED_ATTEMPT_SUBMITTED_ID}/result", headers=auth(login_as("student1")))
    assert res.status_code == 403


# ---- MAX_ATTEMPTS_REACHED


def test_start_blocked_when_no_attempts_left(client, login_as):
    res = start(client, login_as("student2"), SEED_ASSIGNMENT2_ID)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "MAX_ATTEMPTS_REACHED"


# ---- Teacher results view


def test_teacher_views_exam_results(client, login_as):
    res = client.get(f"/api/v1/exams/{SEED_PUBLISHED_EXAM_ID}/results", headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert any(r["studentId"] == SEED_STUDENT2_ID for r in res.json()["data"])


def test_teacher_views_attempt_detail(client, login_as):
    res = client.get(
        f"/api/v1/exams/{SEED_PUBLISHED_EXAM_ID}/attempts/{SEED_ATTEMPT_SUBMITTED_ID}",
        headers=auth(login_as("teacher")),
    )
    data = res.json()["data"]
    assert res.status_code == 200
    assert data["attemptId"] == SEED_ATTEMPT_SUBMITTED_ID
    assert data["studentId"] == SEED_STUDENT2_ID
    assert len(data["review"]) > 0
    assert "correctOption" in data["review"][0]


def test_other_teacher_cannot_view_attempt_detail(client, login_as):
    res = client.get(
        f"/api/v1/exams/{SEED_PUBLISHED_EXAM_ID}/attempts/{SEED_ATTEMPT_SUBMITTED_ID}",
        headers=auth(login_as("teacher2")),
    )
    assert res.status_code == 403
