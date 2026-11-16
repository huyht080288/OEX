from typing import Annotated

from fastapi import APIRouter, Query

from ..deps import DbSession, TeacherUser
from ..errors import no_content, ok
from ..schemas import CreateQuestionBody, ListQuestionsQuery, UpdateQuestionBody
from ..services import question_service

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.get("")
async def list_questions(user: TeacherUser, query: Annotated[ListQuestionsQuery, Query()], db: DbSession):
    return ok(await question_service.list_questions(db, user.id, query))


@router.post("")
async def create_question(user: TeacherUser, body: CreateQuestionBody, db: DbSession):
    return ok(await question_service.create_question(db, user.id, body), "Question created", 201)


@router.get("/{question_id}")
async def get_question(user: TeacherUser, question_id: str, db: DbSession):
    return ok(await question_service.get_question(db, user.id, question_id))


@router.put("/{question_id}")
async def update_question(user: TeacherUser, question_id: str, body: UpdateQuestionBody, db: DbSession):
    return ok(await question_service.update_question(db, user.id, question_id, body), "Question updated")


@router.delete("/{question_id}", status_code=204)
async def delete_question(user: TeacherUser, question_id: str, db: DbSession):
    await question_service.delete_question(db, user.id, question_id)
    return no_content()
