from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dto import auth_profile
from ..errors import AppError
from ..models import User
from ..schemas import ChangePasswordBody, LoginBody
from ..security import expires_in_seconds, hash_password, sign_token, verify_password
from ..utils import utcnow


async def login(db: AsyncSession, body: LoginBody) -> dict[str, Any]:
    user = await db.scalar(select(User).where(User.email == body.email))
    if user is None:
        raise AppError(401, "INVALID_CREDENTIALS", "Invalid email or password")
    if not user.is_active:
        raise AppError(403, "ACCOUNT_INACTIVE", "Account is deactivated")
    if not verify_password(body.password, user.password_hash):
        raise AppError(401, "INVALID_CREDENTIALS", "Invalid email or password")

    return {
        "accessToken": sign_token(user.id, user.email, user.role),
        "expiresIn": expires_in_seconds(),
        "user": auth_profile(user),
    }


async def get_me(db: AsyncSession, user_id: str) -> dict[str, Any]:
    user = await db.get(User, user_id)
    if user is None:
        raise AppError(404, "NOT_FOUND", "User not found")
    return auth_profile(user)


async def change_password(db: AsyncSession, user_id: str, body: ChangePasswordBody) -> None:
    user = await db.get(User, user_id)
    if user is None:
        raise AppError(404, "NOT_FOUND", "User not found")
    if not verify_password(body.currentPassword, user.password_hash):
        raise AppError(400, "VALIDATION_ERROR", "Current password is incorrect")

    user.password_hash = hash_password(body.newPassword)
    user.updated_at = utcnow()
    await db.commit()
