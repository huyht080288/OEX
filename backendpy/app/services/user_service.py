from __future__ import annotations

from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dto import public_user, student_brief
from ..errors import AppError
from ..models import User
from ..schemas import CreateUserBody, ListUsersQuery, UpdateUserBody
from ..security import hash_password
from ..utils import like_pattern, utcnow


def _search_filter(search: str):
    pattern = like_pattern(search)
    return or_(User.email.ilike(pattern, escape="\\"), User.full_name.ilike(pattern, escape="\\"))


async def _get_user(db: AsyncSession, user_id: str) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise AppError(404, "NOT_FOUND", "User not found")
    return user


async def _assert_email_free(db: AsyncSession, email: str, exclude_id: str | None = None) -> None:
    stmt = select(User.id).where(User.email == email)
    if exclude_id:
        stmt = stmt.where(User.id != exclude_id)
    if await db.scalar(stmt) is not None:
        raise AppError(400, "VALIDATION_ERROR", "Email already in use")


async def list_users(db: AsyncSession, query: ListUsersQuery) -> list[dict[str, Any]]:
    stmt = select(User)
    if query.role:
        stmt = stmt.where(User.role == query.role)
    if query.search:
        stmt = stmt.where(_search_filter(query.search))
    users = (await db.scalars(stmt.order_by(User.created_at.desc()))).all()
    return [public_user(u) for u in users]


async def get_user(db: AsyncSession, user_id: str) -> dict[str, Any]:
    return public_user(await _get_user(db, user_id))


async def create_user(db: AsyncSession, body: CreateUserBody) -> dict[str, Any]:
    await _assert_email_free(db, body.email)
    now = utcnow()
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.fullName,
        role=body.role,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    await db.commit()
    return public_user(user)


async def update_user(db: AsyncSession, user_id: str, body: UpdateUserBody) -> dict[str, Any]:
    user = await _get_user(db, user_id)
    sent = body.model_fields_set
    if "email" in sent:
        await _assert_email_free(db, body.email, exclude_id=user.id)
        user.email = body.email
    if "fullName" in sent:
        user.full_name = body.fullName
    if "role" in sent:
        user.role = body.role
    user.updated_at = utcnow()
    await db.commit()
    return public_user(user)


async def update_user_status(db: AsyncSession, user_id: str, is_active: bool) -> dict[str, Any]:
    user = await _get_user(db, user_id)
    user.is_active = is_active
    user.updated_at = utcnow()
    await db.commit()
    return public_user(user)


async def list_students(db: AsyncSession, search: str | None) -> list[dict[str, Any]]:
    stmt = select(User).where(User.role == "STUDENT", User.is_active.is_(True))
    if search:
        stmt = stmt.where(_search_filter(search))
    students = (await db.scalars(stmt.order_by(User.full_name.asc()))).all()
    return [student_brief(s) for s in students]
