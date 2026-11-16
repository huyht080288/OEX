from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..dto import question_dto
from ..errors import AppError
from ..models import AttemptAnswer, ExamQuestion, Question, QuestionOption, Subject
from ..schemas import CreateQuestionBody, ListQuestionsQuery, OptionBody, UpdateQuestionBody
from ..utils import like_pattern, utcnow
from .subject_service import get_owned_subject


def _assert_single_correct(options: list[OptionBody]) -> None:
    if sum(1 for o in options if o.isCorrect) != 1:
        raise AppError(400, "VALIDATION_ERROR", "Select exactly one correct answer")


def _to_points(value: float) -> Decimal:
    return Decimal(repr(value)).quantize(Decimal("0.01"))


def _new_options(question_id: str, options: list[OptionBody]) -> list[QuestionOption]:
    return [
        QuestionOption(question_id=question_id, label=o.label, content=o.content, is_correct=o.isCorrect)
        for o in options
    ]


async def _load_question(db: AsyncSession, question_id: str) -> Question | None:
    stmt = (
        select(Question)
        .where(Question.id == question_id)
        .options(selectinload(Question.options), selectinload(Question.subject))
        .execution_options(populate_existing=True)
    )
    return await db.scalar(stmt)


async def get_owned_question(db: AsyncSession, teacher_id: str, question_id: str) -> Question:
    question = await _load_question(db, question_id)
    if question is None:
        raise AppError(404, "NOT_FOUND", "Question not found")
    if question.subject.teacher_id != teacher_id:
        raise AppError(403, "FORBIDDEN", "You do not own this question")
    return question


async def list_questions(
    db: AsyncSession, teacher_id: str, query: ListQuestionsQuery
) -> list[dict[str, Any]]:
    stmt = (
        select(Question)
        .join(Subject, Subject.id == Question.subject_id)
        .where(Subject.teacher_id == teacher_id)
        .options(selectinload(Question.options))
    )
    if query.subjectId:
        await get_owned_subject(db, teacher_id, query.subjectId)
        stmt = stmt.where(Question.subject_id == query.subjectId)
    if query.difficulty:
        stmt = stmt.where(Question.difficulty == query.difficulty)
    if query.q:
        stmt = stmt.where(Question.content.ilike(like_pattern(query.q), escape="\\"))

    questions = (await db.scalars(stmt.order_by(Question.created_at.desc()))).all()
    return [question_dto(q) for q in questions]


async def create_question(db: AsyncSession, teacher_id: str, body: CreateQuestionBody) -> dict[str, Any]:
    await get_owned_subject(db, teacher_id, body.subjectId)
    _assert_single_correct(body.options)

    now = utcnow()
    question = Question(
        subject_id=body.subjectId,
        content=body.content,
        difficulty=body.difficulty,
        points=_to_points(body.points),
        created_by=teacher_id,
        created_at=now,
        updated_at=now,
    )
    db.add(question)
    await db.flush()
    db.add_all(_new_options(question.id, body.options))
    await db.commit()

    loaded = await _load_question(db, question.id)
    assert loaded is not None
    return question_dto(loaded)


async def get_question(db: AsyncSession, teacher_id: str, question_id: str) -> dict[str, Any]:
    return question_dto(await get_owned_question(db, teacher_id, question_id))


async def update_question(
    db: AsyncSession, teacher_id: str, question_id: str, body: UpdateQuestionBody
) -> dict[str, Any]:
    question = await get_owned_question(db, teacher_id, question_id)
    sent = body.model_fields_set

    if "options" in sent:
        _assert_single_correct(body.options)
        await db.execute(delete(QuestionOption).where(QuestionOption.question_id == question_id))
        db.add_all(_new_options(question_id, body.options))

    if "content" in sent:
        question.content = body.content
    if "difficulty" in sent:
        question.difficulty = body.difficulty
    if "points" in sent:
        question.points = _to_points(body.points)
    question.updated_at = utcnow()
    await db.commit()

    loaded = await _load_question(db, question_id)
    assert loaded is not None
    return question_dto(loaded)


async def delete_question(db: AsyncSession, teacher_id: str, question_id: str) -> None:
    await get_owned_question(db, teacher_id, question_id)

    used_in_exams = await db.scalar(
        select(func.count()).select_from(ExamQuestion).where(ExamQuestion.question_id == question_id)
    )
    used_in_attempts = await db.scalar(
        select(func.count()).select_from(AttemptAnswer).where(AttemptAnswer.question_id == question_id)
    )
    if used_in_exams or used_in_attempts:
        raise AppError(400, "VALIDATION_ERROR", "Cannot delete a question that is used in exams")

    await db.execute(delete(Question).where(Question.id == question_id))
    await db.commit()
