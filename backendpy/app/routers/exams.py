from fastapi import APIRouter

from ..deps import DbSession, TeacherUser
from ..errors import no_content, ok
from ..schemas import (
    AssignStudentsBody,
    CreateExamBody,
    SetExamQuestionsBody,
    UpdateExamBody,
    UpdateExamStatusBody,
)
from ..services import exam_service

router = APIRouter(prefix="/exams", tags=["Exams"])


@router.get("")
async def list_exams(user: TeacherUser, db: DbSession):
    return ok(await exam_service.list_exams(db, user.id))


@router.post("")
async def create_exam(user: TeacherUser, body: CreateExamBody, db: DbSession):
    return ok(await exam_service.create_exam(db, user.id, body), "Exam created", 201)


@router.get("/{exam_id}")
async def get_exam(user: TeacherUser, exam_id: str, db: DbSession):
    return ok(await exam_service.get_exam(db, user.id, exam_id))


@router.put("/{exam_id}")
async def update_exam(user: TeacherUser, exam_id: str, body: UpdateExamBody, db: DbSession):
    return ok(await exam_service.update_exam(db, user.id, exam_id, body), "Exam updated")


@router.delete("/{exam_id}", status_code=204)
async def delete_exam(user: TeacherUser, exam_id: str, db: DbSession):
    await exam_service.delete_exam(db, user.id, exam_id)
    return no_content()


@router.put("/{exam_id}/questions")
async def set_exam_questions(user: TeacherUser, exam_id: str, body: SetExamQuestionsBody, db: DbSession):
    return ok(await exam_service.set_exam_questions(db, user.id, exam_id, body), "Exam questions updated")


@router.patch("/{exam_id}/status")
async def update_exam_status(user: TeacherUser, exam_id: str, body: UpdateExamStatusBody, db: DbSession):
    return ok(await exam_service.update_exam_status(db, user.id, exam_id, body), "Exam status updated")


@router.post("/{exam_id}/assignments")
async def assign_students(user: TeacherUser, exam_id: str, body: AssignStudentsBody, db: DbSession):
    return ok(await exam_service.assign_students(db, user.id, exam_id, body), "Students assigned", 201)


@router.get("/{exam_id}/assignments")
async def list_assignments(user: TeacherUser, exam_id: str, db: DbSession):
    return ok(await exam_service.list_assignments(db, user.id, exam_id))


@router.delete("/{exam_id}/assignments/{assignment_id}", status_code=204)
async def remove_assignment(user: TeacherUser, exam_id: str, assignment_id: str, db: DbSession):
    await exam_service.remove_assignment(db, user.id, exam_id, assignment_id)
    return no_content()


@router.get("/{exam_id}/results")
async def get_exam_results(user: TeacherUser, exam_id: str, db: DbSession):
    return ok(await exam_service.get_exam_results(db, user.id, exam_id))


@router.get("/{exam_id}/attempts/{attempt_id}")
async def get_exam_attempt_result(user: TeacherUser, exam_id: str, attempt_id: str, db: DbSession):
    return ok(await exam_service.get_exam_attempt_result(db, user.id, exam_id, attempt_id))
