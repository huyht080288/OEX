from app.seed_data import SEED_PASSWORD, SEED_USERS

from .conftest import auth, unique


def login(client, email, password):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_login_valid_credentials_returns_jwt_and_user(client):
    res = login(client, SEED_USERS["student1"]["email"], SEED_PASSWORD)
    body = res.json()
    assert res.status_code == 200
    assert body["success"] is True
    assert body["data"]["accessToken"]
    assert body["data"]["expiresIn"] > 0
    assert body["data"]["user"]["email"] == SEED_USERS["student1"]["email"]
    assert body["data"]["user"]["fullName"] == SEED_USERS["student1"]["fullName"]
    assert body["data"]["user"]["role"] == "STUDENT"


def test_login_wrong_password_returns_401(client):
    res = login(client, SEED_USERS["admin"]["email"], "wrong-password")
    assert res.status_code == 401
    assert res.json()["success"] is False
    assert res.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_inactive_user_returns_403(client):
    res = login(client, SEED_USERS["inactive"]["email"], SEED_PASSWORD)
    assert res.status_code == 403
    assert res.json()["success"] is False
    assert res.json()["error"]["code"] == "ACCOUNT_INACTIVE"


def test_login_invalid_email_returns_400(client):
    res = login(client, "not-an-email", "x")
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_me_returns_profile(client, login_as):
    res = client.get("/api/v1/auth/me", headers=auth(login_as("teacher")))
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert res.json()["data"]["email"] == SEED_USERS["teacher"]["email"]
    assert res.json()["data"]["role"] == "TEACHER"


def test_me_missing_token_returns_401(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_me_invalid_token_returns_401(client):
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid-token"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_change_password_updates_password(client, login_as):
    email = f"{unique('pwd-change-')}@oex.test"
    client.post(
        "/api/v1/users",
        headers=auth(login_as("admin")),
        json={"email": email, "password": "OldPassword1!", "fullName": "Pwd Change User", "role": "STUDENT"},
    )
    token = login(client, email, "OldPassword1!").json()["data"]["accessToken"]

    res = client.post(
        "/api/v1/auth/change-password",
        headers=auth(token),
        json={"currentPassword": "OldPassword1!", "newPassword": "NewPassword1!"},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert login(client, email, "OldPassword1!").status_code == 401
    assert login(client, email, "NewPassword1!").status_code == 200


def test_change_password_wrong_current_returns_400(client, login_as):
    res = client.post(
        "/api/v1/auth/change-password",
        headers=auth(login_as("student1")),
        json={"currentPassword": "wrong-password", "newPassword": "NewPassword1!"},
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_change_password_requires_auth(client):
    res = client.post(
        "/api/v1/auth/change-password", json={"currentPassword": "x", "newPassword": "NewPassword1!"}
    )
    assert res.status_code == 401
