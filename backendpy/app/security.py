"""Password hashing (bcrypt) and JWT (HS256) — compatible with the Node backend."""

from __future__ import annotations

import time
from typing import Any

import bcrypt
import jwt

from .config import get_settings

BCRYPT_ROUNDS = 10


def _pw_bytes(password: str) -> bytes:
    # bcrypt only uses the first 72 bytes; Node's bcrypt truncates silently, bcrypt>=5 raises.
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_pw_bytes(password), bcrypt.gensalt(BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_pw_bytes(password), password_hash.encode("utf-8"))
    except ValueError:
        return False


def _secret() -> str:
    secret = get_settings().jwt_secret
    if not secret:
        raise RuntimeError("JWT_SECRET is not configured")
    return secret


def expires_in_seconds() -> int:
    return get_settings().jwt_expires_in


def sign_token(user_id: str, email: str, role: str) -> str:
    now = int(time.time())
    payload = {"sub": user_id, "email": email, "role": role, "iat": now, "exp": now + expires_in_seconds()}
    return jwt.encode(payload, _secret(), algorithm="HS256")


def verify_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, _secret(), algorithms=["HS256"])
