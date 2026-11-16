from app.seed_data import SEED_STUDENT1_ID, SEED_STUDENT2_ID, SEED_TEACHER_ID, SEED_USERS

from .conftest import auth, unique


def create_user(client, token, email, full_name):
    return client.post(
        "/api/v1/users",
        headers=auth(token),
        json={"email": email, "password": "Password123!", "fullName": full_name, "role": "STUDENT"},
    )


def test_admin_can_list_users(client, login_as):
    res = client.get("/api/v1/users", headers=auth(login_as("admin")))
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert len(res.json()["data"]) >= 5


def test_list_users_filters_by_role(client, login_as):
    res = client.get("/api/v1/users", params={"role": "STUDENT"}, headers=auth(login_as("admin")))
    data = res.json()["data"]
    assert res.status_code == 200
    assert all(u["role"] == "STUDENT" for u in data)
    assert any(u["id"] == SEED_STUDENT1_ID for u in data)
    assert any(u["id"] == SEED_STUDENT2_ID for u in data)


def test_list_users_search(client, login_as):
    res = client.get("/api/v1/users", params={"search": "teacher"}, headers=auth(login_as("admin")))
    assert res.status_code == 200
    assert any(u["email"] == SEED_USERS["teacher"]["email"] for u in res.json()["data"])


def test_admin_creates_user(client, login_as):
    email = f"{unique('new-student-')}@oex.test"
    res = create_user(client, login_as("admin"), email, "New Student")
    data = res.json()["data"]
    assert res.status_code == 201
    assert res.json()["success"] is True
    assert data["email"] == email
    assert data["fullName"] == "New Student"
    assert data["role"] == "STUDENT"
    assert data["isActive"] is True


def test_create_user_duplicate_email_returns_400(client, login_as):
    res = client.post(
        "/api/v1/users",
        headers=auth(login_as("admin")),
        json={"email": SEED_USERS["admin"]["email"], "password": "Password123!", "fullName": "Duplicate", "role": "ADMIN"},
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_get_user_by_id(client, login_as):
    res = client.get(f"/api/v1/users/{SEED_TEACHER_ID}", headers=auth(login_as("admin")))
    assert res.status_code == 200
    assert res.json()["data"]["email"] == SEED_USERS["teacher"]["email"]


def test_get_user_not_found_returns_404(client, login_as):
    res = client.get("/api/v1/users/00000000-0000-4000-8000-000000009999", headers=auth(login_as("admin")))
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


def test_update_user(client, login_as):
    token = login_as("admin")
    user_id = create_user(client, token, f"{unique('update-')}@oex.test", "Before Update").json()["data"]["id"]
    res = client.put(f"/api/v1/users/{user_id}", headers=auth(token), json={"fullName": "After Update"})
    assert res.status_code == 200
    assert res.json()["data"]["fullName"] == "After Update"


def test_deactivate_user(client, login_as):
    token = login_as("admin")
    user_id = create_user(client, token, f"{unique('deactivate-')}@oex.test", "To Deactivate").json()["data"]["id"]
    res = client.patch(f"/api/v1/users/{user_id}/status", headers=auth(token), json={"isActive": False})
    assert res.status_code == 200
    assert res.json()["data"]["isActive"] is False


def test_list_users_student_forbidden(client, login_as):
    res = client.get("/api/v1/users", headers=auth(login_as("student1")))
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_list_users_unauthenticated(client):
    res = client.get("/api/v1/users")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"
