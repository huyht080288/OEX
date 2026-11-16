"""End-to-end API flow (design §7 UC-07 / UC-08):
login → list assigned exams → start attempt → save answers → submit → view result."""

import pytest

from app.seed_data import (
    SEED_ASSIGNMENT2_ID,
    SEED_PUBLISHED_EXAM_ID,
    SEED_Q1_OPT_B_ID,
    SEED_Q2_OPT_B_ID,
    SEED_Q3_OPT_B_ID,
    SEED_QUESTION1_ID,
    SEED_QUESTION2_ID,
    SEED_QUESTION3_ID,
)

from .conftest import auth
from .db_helpers import reset_seed_assignment_attempts


@pytest.fixture(scope="module", autouse=True)
def _reset_attempts(database_url):
    reset_seed_assignment_attempts()


def test_student_flow(client):
    login = client.post("/api/v1/auth/login", json={"email": "student2@oex.test", "password": "Password123!"})
    assert login.status_code == 200
    assert login.json()["success"] is True
    assert login.json()["data"]["user"]["role"] == "STUDENT"
    token = login.json()["data"]["accessToken"]

    my_exams = client.get("/api/v1/my-exams", headers=auth(token))
    assert my_exams.status_code == 200
    assignment = next(a for a in my_exams.json()["data"] if a["exam"]["id"] == SEED_PUBLISHED_EXAM_ID)
    assert assignment["assignmentId"] == SEED_ASSIGNMENT2_ID
    assert assignment["exam"]["subjectName"]

    started = client.post("/api/v1/attempts/start", headers=auth(token), json={"assignmentId": SEED_ASSIGNMENT2_ID})
    assert started.status_code == 201
    assert started.json()["data"]["examTitle"]
    attempt_id = started.json()["data"]["attemptId"]
    assert len(started.json()["data"]["questions"]) >= 3
    for q in started.json()["data"]["questions"]:
        for opt in q["options"]:
            assert "isCorrect" not in opt

    assert client.get(f"/api/v1/attempts/{attempt_id}", headers=auth(token)).status_code == 200

    answers = [
        {"questionId": SEED_QUESTION1_ID, "selectedOptionId": SEED_Q1_OPT_B_ID},
        {"questionId": SEED_QUESTION2_ID, "selectedOptionId": SEED_Q2_OPT_B_ID},
        {"questionId": SEED_QUESTION3_ID, "selectedOptionId": SEED_Q3_OPT_B_ID},
    ]
    saved = client.put(f"/api/v1/attempts/{attempt_id}/answers", headers=auth(token), json={"answers": answers})
    assert saved.status_code == 200

    submitted = client.post(f"/api/v1/attempts/{attempt_id}/submit", headers=auth(token))
    data = submitted.json()["data"]
    assert submitted.status_code == 200
    assert data["score"] == 4
    assert data["maxScore"] == 4
    assert data["correctCount"] == 3
    assert len(data["review"]) == 3
    assert data["review"][0]["correctOption"]

    result = client.get(f"/api/v1/attempts/{attempt_id}/result", headers=auth(token))
    assert result.status_code == 200
    assert result.json()["data"]["status"] == "SUBMITTED"
    assert result.json()["data"]["score"] == 4
    assert result.json()["data"]["examTitle"]


def test_my_exams_requires_auth(client):
    assert client.get("/api/v1/my-exams").status_code == 401
