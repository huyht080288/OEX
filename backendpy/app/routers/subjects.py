from fastapi import APIRouter

from ..deps import DbSession, TeacherUser
from ..errors import no_content, ok
from ..schemas import CreateSubjectBody, UpdateSubjectBody
from ..services import subject_service

router = APIRouter(prefix="/subjects", tags=["Subjects"])


@router.get("")
async def list_subjects(user: TeacherUser, db: DbSession):
    return ok(await subject_service.list_subjects(db, user.id))


@router.post("")
async def create_subject(user: TeacherUser, body: CreateSubjectBody, db: DbSession):
    return ok(await subject_service.create_subject(db, user.id, body), "Subject created", 201)


@router.get("/{subject_id}")
async def get_subject(user: TeacherUser, subject_id: str, db: DbSession):
    return ok(await subject_service.get_subject(db, user.id, subject_id))


@router.put("/{subject_id}")
async def update_subject(user: TeacherUser, subject_id: str, body: UpdateSubjectBody, db: DbSession):
    return ok(await subject_service.update_subject(db, user.id, subject_id, body), "Subject updated")


@router.delete("/{subject_id}", status_code=204)
async def delete_subject(user: TeacherUser, subject_id: str, db: DbSession):
    await subject_service.delete_subject(db, user.id, subject_id)
    return no_content()
