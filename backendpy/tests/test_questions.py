from app.seed_data import SEED_QUESTION1_ID, SEED_SUBJECT2_ID, SEED_SUBJECT_ID

from .conftest import auth

VALID_OPTIONS = [
    {"label": "A", "content": "Alpha", "isCorrect": False},
    {"label": "B", "content": "Beta", "isCorrect": True},
    {"label": "C", "content": "Gamma", "isCorrect": False},
]


def create_question(client, token, content, subject_id=SEED_SUBJECT_ID, options=None, difficulty="EASY", points=1):
    return client.post(
        "/api/v1/questions",
        headers=auth(token),
        json={
            "subjectId": subject_id,
            "content": content,
            "difficulty": difficulty,
            "points": points,
            "options": options or VALID_OPTIONS,
        },
    )


def test_lists_questions_for_own_subjects(client, login_as):
    res = client.get("/api/v1/questions", headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert len(res.json()["data"]) >= 3


def test_filters_by_subject(client, login_as):
    res = client.get("/api/v1/questions", params={"subjectId": SEED_SUBJECT_ID}, headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert all(q["subjectId"] == SEED_SUBJECT_ID for q in res.json()["data"])


def test_filters_by_content(client, login_as):
    res = client.get("/api/v1/questions", params={"q": "France"}, headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert any(q["id"] == SEED_QUESTION1_ID for q in res.json()["data"])


def test_creates_question_with_one_correct(client, login_as):
    res = create_question(client, login_as("teacher"), "New test question?")
    assert res.status_code == 201
    assert len([o for o in res.json()["data"]["options"] if o["isCorrect"]]) == 1


def test_two_correct_options_returns_400(client, login_as):
    res = create_question(
        client,
        login_as("teacher"),
        "Bad question?",
        options=[
            {"label": "A", "content": "A", "isCorrect": True},
            {"label": "B", "content": "B", "isCorrect": True},
        ],
    )
    assert res.status_code == 400
    assert "exactly one correct" in res.json()["error"]["message"]


def test_zero_correct_options_returns_400(client, login_as):
    res = create_question(
        client,
        login_as("teacher"),
        "No correct?",
        options=[
            {"label": "A", "content": "A", "isCorrect": False},
            {"label": "B", "content": "B", "isCorrect": False},
        ],
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_get_question_includes_is_correct_for_teacher(client, login_as):
    res = client.get(f"/api/v1/questions/{SEED_QUESTION1_ID}", headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert any(o["isCorrect"] is True for o in res.json()["data"]["options"])


def test_update_question(client, login_as):
    token = login_as("teacher")
    question_id = create_question(client, token, "Update me?", difficulty="MEDIUM", points=2).json()["data"]["id"]
    res = client.put(f"/api/v1/questions/{question_id}", headers=auth(token), json={"content": "Updated content"})
    assert res.status_code == 200
    assert res.json()["data"]["content"] == "Updated content"


def test_delete_question(client, login_as):
    token = login_as("teacher")
    question_id = create_question(client, token, "Delete me?").json()["data"]["id"]
    res = client.delete(f"/api/v1/questions/{question_id}", headers=auth(token))
    assert res.status_code == 204


def test_other_teacher_subject_returns_403(client, login_as):
    res = create_question(client, login_as("teacher"), "Not yours", subject_id=SEED_SUBJECT2_ID)
    assert res.status_code == 403
