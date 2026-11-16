from fastapi import APIRouter

from ..deps import CurrentUser, DbSession
from ..errors import ok
from ..schemas import ChangePasswordBody, LoginBody
from ..services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login")
async def login(body: LoginBody, db: DbSession):
    return ok(await auth_service.login(db, body), "Login successful")


@router.get("/me")
async def me(user: CurrentUser, db: DbSession):
    return ok(await auth_service.get_me(db, user.id))


@router.post("/change-password")
async def change_password(user: CurrentUser, body: ChangePasswordBody, db: DbSession):
    await auth_service.change_password(db, user.id, body)
    return ok(None, "Password updated")
