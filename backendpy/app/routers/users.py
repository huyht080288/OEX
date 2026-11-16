from typing import Annotated

from fastapi import APIRouter, Query

from ..deps import AdminUser, DbSession
from ..errors import ok
from ..schemas import CreateUserBody, ListUsersQuery, UpdateUserBody, UpdateUserStatusBody
from ..services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("")
async def list_users(_: AdminUser, query: Annotated[ListUsersQuery, Query()], db: DbSession):
    return ok(await user_service.list_users(db, query))


@router.post("")
async def create_user(_: AdminUser, body: CreateUserBody, db: DbSession):
    return ok(await user_service.create_user(db, body), "User created", 201)


@router.get("/{user_id}")
async def get_user(_: AdminUser, user_id: str, db: DbSession):
    return ok(await user_service.get_user(db, user_id))


@router.put("/{user_id}")
async def update_user(_: AdminUser, user_id: str, body: UpdateUserBody, db: DbSession):
    return ok(await user_service.update_user(db, user_id, body), "User updated")


@router.patch("/{user_id}/status")
async def update_user_status(_: AdminUser, user_id: str, body: UpdateUserStatusBody, db: DbSession):
    return ok(await user_service.update_user_status(db, user_id, body.isActive), "User status updated")
