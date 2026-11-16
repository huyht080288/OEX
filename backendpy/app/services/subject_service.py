from __future__ import annotations

from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dto import subject_dto
from ..errors import AppError
from ..models import Exam, Question, Subject
from ..schemas import CreateSubjectBody, UpdateSubjectBody
from ..utils import utcnow


async def get_owned_subject(db: AsyncSession, teacher_id: str, subject_id: str) -> Subject:
    subject = await db.get(Subject, subject_id)
    if subject is None:
        raise AppError(404, "NOT_FOUND", "Subject not found")
    if subject.teacher_id != teacher_id:
        raise AppError(403, "FORBIDDEN", "You do not own this subject")
    return subject


async def _assert_code_free(
    db: AsyncSession, teacher_id: str, code: str, exclude_id: str | None = None
) -> None:
    stmt = select(Subject.id).where(Subject.teacher_id == teacher_id, Subject.code == code)
    if exclude_id:
        stmt = stmt.where(Subject.id != exclude_id)
    if await db.scalar(stmt) is not None:
        raise AppError(400, "VALIDATION_ERROR", "Subject code already exists for this teacher")


async def list_subjects(db: AsyncSession, teacher_id: str) -> list[dict[str, Any]]:
    stmt = select(Subject).where(Subject.teacher_id == teacher_id).order_by(Subject.created_at.desc())
    return [subject_dto(s) for s in (await db.scalars(stmt)).all()]


async def create_subject(db: AsyncSession, teacher_id: str, body: CreateSubjectBody) -> dict[str, Any]:
    await _assert_code_free(db, teacher_id, body.code)
    now = utcnow()
    subject = Subject(
        code=body.code,
        name=body.name,
        description=body.description,
        teacher_id=teacher_id,
        created_at=now,
        updated_at=now,
    )
    db.add(subject)
    await db.commit()
    return subject_dto(subject)


async def get_subject(db: AsyncSession, teacher_id: str, subject_id: str) -> dict[str, Any]:
    return subject_dto(await get_owned_subject(db, teacher_id, subject_id))


async def update_subject(
    db: AsyncSession, teacher_id: str, subject_id: str, body: UpdateSubjectBody
) -> dict[str, Any]:
    subject = await get_owned_subject(db, teacher_id, subject_id)
    sent = body.model_fields_set
    if "code" in sent:
        await _assert_code_free(db, teacher_id, body.code, exclude_id=subject.id)
        subject.code = body.code
    if "name" in sent:
        subject.name = body.name
    if "description" in sent:
        subject.description = body.description
    subject.updated_at = utcnow()
    await db.commit()
    return subject_dto(subject)


async def delete_subject(db: AsyncSession, teacher_id: str, subject_id: str) -> None:
    await get_owned_subject(db, teacher_id, subject_id)
    question_count = await db.scalar(
        select(func.count()).select_from(Question).where(Question.subject_id == subject_id)
    )
    exam_count = await db.scalar(
        select(func.count()).select_from(Exam).where(Exam.subject_id == subject_id)
    )
    if question_count or exam_count:
        raise AppError(400, "VALIDATION_ERROR", "Cannot delete subject with existing questions or exams")
    await db.execute(delete(Subject).where(Subject.id == subject_id))
    await db.commit()
