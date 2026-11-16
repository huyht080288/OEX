from fastapi import APIRouter

from ..deps import DbSession, StudentUser
from ..errors import ok
from ..schemas import SaveAnswersBody, StartAttemptBody
from ..services import attempt_service

my_exams_router = APIRouter(prefix="/my-exams", tags=["Student"])
router = APIRouter(prefix="/attempts", tags=["Student"])


@my_exams_router.get("")
async def list_my_exams(user: StudentUser, db: DbSession):
    return ok(await attempt_service.list_my_exams(db, user.id))


@router.post("/start")
async def start_attempt(user: StudentUser, body: StartAttemptBody, db: DbSession):
    return ok(await attempt_service.start_attempt(db, user.id, body), "Attempt started", 201)


@router.get("/{attempt_id}/result")
async def get_attempt_result(user: StudentUser, attempt_id: str, db: DbSession):
    return ok(await attempt_service.get_attempt_result(db, user.id, attempt_id))


@router.get("/{attempt_id}")
async def get_attempt(user: StudentUser, attempt_id: str, db: DbSession):
    return ok(await attempt_service.get_attempt(db, user.id, attempt_id))


@router.put("/{attempt_id}/answers")
async def save_answers(user: StudentUser, attempt_id: str, body: SaveAnswersBody, db: DbSession):
    return ok(await attempt_service.save_answers(db, user.id, attempt_id, body), "Answers saved")


@router.post("/{attempt_id}/submit")
async def submit_attempt(user: StudentUser, attempt_id: str, db: DbSession):
    return ok(await attempt_service.submit_attempt(db, user.id, attempt_id), "Exam submitted")
