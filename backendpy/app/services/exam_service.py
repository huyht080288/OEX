from __future__ import annotations

from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..dto import assignment_dto, exam_detail_dto, exam_dto
from ..errors import AppError
from ..models import (
    Exam,
    ExamAssignment,
    ExamAttempt,
    ExamQuestion,
    Question,
    Subject,
    User,
)
from ..schemas import (
    AssignStudentsBody,
    CreateExamBody,
    SetExamQuestionsBody,
    UpdateExamBody,
    UpdateExamStatusBody,
)
from ..utils import iso, num, parse_iso_utc, utcnow
from . import attempt_service
from .subject_service import get_owned_subject


async def get_owned_exam(db: AsyncSession, teacher_id: str, exam_id: str) -> Exam:
    exam = await db.get(Exam, exam_id, populate_existing=True)
    if exam is None:
        raise AppError(404, "NOT_FOUND", "Exam not found")
    if exam.created_by != teacher_id:
        raise AppError(403, "FORBIDDEN", "You do not own this exam")
    return exam


def _assert_draft(exam: Exam, action: str) -> None:
    if exam.status != "DRAFT":
        raise AppError(400, "VALIDATION_ERROR", f"Cannot {action} a non-draft exam")


async def list_exams(db: AsyncSession, teacher_id: str) -> list[dict[str, Any]]:
    stmt = select(Exam).where(Exam.created_by == teacher_id).order_by(Exam.created_at.desc())
    return [exam_dto(e) for e in (await db.scalars(stmt)).all()]


async def create_exam(db: AsyncSession, teacher_id: str, body: CreateExamBody) -> dict[str, Any]:
    await get_owned_subject(db, teacher_id, body.subjectId)
    now = utcnow()
    exam = Exam(
        subject_id=body.subjectId,
        title=body.title,
        description=body.description,
        duration_minutes=body.durationMinutes,
        open_at=parse_iso_utc(body.openAt),
        close_at=parse_iso_utc(body.closeAt),
        max_attempts=body.maxAttempts,
        show_answers_after_submit=body.showAnswersAfterSubmit,
        status="DRAFT",
        created_by=teacher_id,
        created_at=now,
        updated_at=now,
    )
    db.add(exam)
    await db.commit()
    return exam_dto(exam)


async def get_exam(db: AsyncSession, teacher_id: str, exam_id: str) -> dict[str, Any]:
    await get_owned_exam(db, teacher_id, exam_id)
    stmt = (
        select(Exam)
        .where(Exam.id == exam_id)
        .options(
            selectinload(Exam.questions).selectinload(ExamQuestion.question).selectinload(Question.options),
            selectinload(Exam.assignments).selectinload(ExamAssignment.student),
        )
        .execution_options(populate_existing=True)
    )
    exam = await db.scalar(stmt)
    assert exam is not None
    return exam_detail_dto(exam)


async def update_exam(db: AsyncSession, teacher_id: str, exam_id: str, body: UpdateExamBody) -> dict[str, Any]:
    exam = await get_owned_exam(db, teacher_id, exam_id)
    _assert_draft(exam, "update")
    sent = body.model_fields_set

    if "openAt" in sent and "closeAt" in sent and parse_iso_utc(body.closeAt) <= parse_iso_utc(body.openAt):
        raise AppError(400, "VALIDATION_ERROR", "closeAt must be after openAt")

    if "title" in sent:
        exam.title = body.title
    if "description" in sent:
        exam.description = body.description
    if "durationMinutes" in sent:
        exam.duration_minutes = body.durationMinutes
    if "openAt" in sent:
        exam.open_at = parse_iso_utc(body.openAt)
    if "closeAt" in sent:
        exam.close_at = parse_iso_utc(body.closeAt)
    if "maxAttempts" in sent:
        exam.max_attempts = body.maxAttempts
    if "showAnswersAfterSubmit" in sent:
        exam.show_answers_after_submit = body.showAnswersAfterSubmit
    exam.updated_at = utcnow()
    await db.commit()
    return exam_dto(exam)


async def delete_exam(db: AsyncSession, teacher_id: str, exam_id: str) -> None:
    exam = await get_owned_exam(db, teacher_id, exam_id)
    _assert_draft(exam, "delete")
    await db.execute(delete(Exam).where(Exam.id == exam_id))
    await db.commit()


async def set_exam_questions(
    db: AsyncSession, teacher_id: str, exam_id: str, body: SetExamQuestionsBody
) -> dict[str, Any]:
    exam = await get_owned_exam(db, teacher_id, exam_id)
    _assert_draft(exam, "modify questions on")

    found = await db.scalar(
        select(func.count())
        .select_from(Question)
        .join(Subject, Subject.id == Question.subject_id)
        .where(
            Question.id.in_(body.questionIds),
            Question.subject_id == exam.subject_id,
            Subject.teacher_id == teacher_id,
        )
    )
    if found != len(body.questionIds):
        raise AppError(
            400, "VALIDATION_ERROR", "All questions must belong to the exam subject and be owned by you"
        )

    await db.execute(delete(ExamQuestion).where(ExamQuestion.exam_id == exam_id))
    db.add_all(
        ExamQuestion(exam_id=exam_id, question_id=qid, order_index=i + 1)
        for i, qid in enumerate(body.questionIds)
    )
    await db.commit()
    return await get_exam(db, teacher_id, exam_id)


async def update_exam_status(
    db: AsyncSession, teacher_id: str, exam_id: str, body: UpdateExamStatusBody
) -> dict[str, Any]:
    exam = await get_owned_exam(db, teacher_id, exam_id)

    if body.status == "PUBLISHED":
        if exam.status != "DRAFT":
            raise AppError(400, "VALIDATION_ERROR", "Only draft exams can be published")
        question_count = await db.scalar(
            select(func.count()).select_from(ExamQuestion).where(ExamQuestion.exam_id == exam_id)
        )
        if not question_count:
            raise AppError(400, "VALIDATION_ERROR", "Exam must have at least one question to publish")
        if exam.close_at <= exam.open_at:
            raise AppError(400, "VALIDATION_ERROR", "closeAt must be after openAt")

    if body.status == "CLOSED" and exam.status != "PUBLISHED":
        raise AppError(400, "VALIDATION_ERROR", "Only published exams can be closed")

    exam.status = body.status
    exam.updated_at = utcnow()
    await db.commit()
    return exam_dto(exam)


async def assign_students(
    db: AsyncSession, teacher_id: str, exam_id: str, body: AssignStudentsBody
) -> list[dict[str, Any]]:
    exam = await get_owned_exam(db, teacher_id, exam_id)
    if exam.status == "CLOSED":
        raise AppError(400, "VALIDATION_ERROR", "Cannot assign students to a closed exam")

    students = (
        await db.scalars(
            select(User).where(
                User.id.in_(body.studentIds), User.role == "STUDENT", User.is_active.is_(True)
            )
        )
    ).all()
    if len(students) != len(body.studentIds):
        raise AppError(400, "VALIDATION_ERROR", "All student IDs must be active students")

    already = await db.scalar(
        select(ExamAssignment.id).where(
            ExamAssignment.exam_id == exam_id, ExamAssignment.student_id.in_(body.studentIds)
        )
    )
    if already is not None:
        raise AppError(409, "VALIDATION_ERROR", "Student is already assigned to this exam")

    by_id = {s.id: s for s in students}
    created = []
    for student_id in body.studentIds:
        assignment = ExamAssignment(
            exam_id=exam_id, student_id=student_id, assigned_by=teacher_id, assigned_at=utcnow()
        )
        db.add(assignment)
        created.append(assignment)
    await db.commit()
    return [assignment_dto(a, by_id[a.student_id]) for a in created]


async def list_assignments(db: AsyncSession, teacher_id: str, exam_id: str) -> list[dict[str, Any]]:
    await get_owned_exam(db, teacher_id, exam_id)
    stmt = (
        select(ExamAssignment)
        .where(ExamAssignment.exam_id == exam_id)
        .options(selectinload(ExamAssignment.student))
        .order_by(ExamAssignment.assigned_at.desc())
    )
    return [assignment_dto(a, a.student) for a in (await db.scalars(stmt)).all()]


async def remove_assignment(db: AsyncSession, teacher_id: str, exam_id: str, assignment_id: str) -> None:
    await get_owned_exam(db, teacher_id, exam_id)
    assignment = await db.scalar(
        select(ExamAssignment).where(ExamAssignment.id == assignment_id, ExamAssignment.exam_id == exam_id)
    )
    if assignment is None:
        raise AppError(404, "NOT_FOUND", "Assignment not found")

    attempt_count = await db.scalar(
        select(func.count()).select_from(ExamAttempt).where(ExamAttempt.assignment_id == assignment_id)
    )
    if attempt_count:
        raise AppError(
            400,
            "VALIDATION_ERROR",
            "Cannot remove assignment after student has started or completed the exam",
        )

    await db.execute(delete(ExamAssignment).where(ExamAssignment.id == assignment_id))
    await db.commit()


async def get_exam_results(db: AsyncSession, teacher_id: str, exam_id: str) -> list[dict[str, Any]]:
    await get_owned_exam(db, teacher_id, exam_id)
    stmt = (
        select(ExamAttempt)
        .join(ExamAssignment, ExamAssignment.id == ExamAttempt.assignment_id)
        .where(ExamAssignment.exam_id == exam_id)
        .options(selectinload(ExamAttempt.assignment).selectinload(ExamAssignment.student))
        .order_by(ExamAttempt.started_at.desc())
    )
    attempts = (await db.scalars(stmt)).all()
    return [
        {
            "attemptId": a.id,
            "studentId": a.assignment.student_id,
            "studentName": a.assignment.student.full_name,
            "studentEmail": a.assignment.student.email,
            "status": a.status,
            "score": num(a.score),
            "maxScore": num(a.max_score),
            "startedAt": iso(a.started_at),
            "submittedAt": iso(a.submitted_at),
        }
        for a in attempts
    ]


async def get_exam_attempt_result(
    db: AsyncSession, teacher_id: str, exam_id: str, attempt_id: str
) -> dict[str, Any]:
    return await attempt_service.get_attempt_result_for_teacher(db, teacher_id, exam_id, attempt_id)
