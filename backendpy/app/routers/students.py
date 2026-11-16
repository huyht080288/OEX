from typing import Annotated

from fastapi import APIRouter, Query

from ..deps import DbSession, TeacherUser
from ..errors import ok
from ..schemas import SearchQuery
from ..services import user_service

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("")
async def list_students(_: TeacherUser, query: Annotated[SearchQuery, Query()], db: DbSession):
    return ok(await user_service.list_students(db, query.search))
