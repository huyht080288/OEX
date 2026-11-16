"""Auth dependencies: Bearer JWT → active user, plus role guards."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_db
from .errors import AppError
from .models import User
from .security import verify_token

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def current_user(request: Request, db: DbSession) -> User:
    header = request.headers.get("authorization", "")
    if not header.startswith("Bearer "):
        raise AppError(401, "UNAUTHORIZED", "Authentication required")

    try:
        payload = verify_token(header[7:])
        user_id = str(payload["sub"])
    except Exception as exc:  # invalid signature, expired, malformed, missing sub
        raise AppError(401, "UNAUTHORIZED", "Invalid or expired token") from exc

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise AppError(401, "UNAUTHORIZED", "Invalid or expired token")
    return user


def require_role(*roles: str):
    async def dependency(user: Annotated[User, Depends(current_user)]) -> User:
        if user.role not in roles:
            raise AppError(403, "FORBIDDEN", "Insufficient permissions")
        return user

    return dependency


require_admin = require_role("ADMIN")
require_teacher = require_role("TEACHER")
require_student = require_role("STUDENT")

CurrentUser = Annotated[User, Depends(current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
TeacherUser = Annotated[User, Depends(require_teacher)]
StudentUser = Annotated[User, Depends(require_student)]
