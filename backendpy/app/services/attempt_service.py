"""Student exam taking: start, save answers, submit, auto-expire, results.

Security rule: student payloads for IN_PROGRESS attempts never include `isCorrect`.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..errors import AppError
from ..models import (
    AttemptAnswer,
    Exam,
    ExamAssignment,
    ExamAttempt,
    ExamQuestion,
    Question,
    User,
)
from ..schemas import SaveAnswersBody, StartAttemptBody
from ..utils import iso, minutes_later, num, utcnow

DONE_STATUSES = ("SUBMITTED", "EXPIRED")


def _attempt_load_options():
    return (
        selectinload(ExamAttempt.answers),
        selectinload(ExamAttempt.assignment)
        .selectinload(ExamAssignment.exam)
        .selectinload(Exam.questions)
        .selectinload(ExamQuestion.question)
        .selectinload(Question.options),
    )


async def _load_attempt(db: AsyncSession, attempt_id: str, *, for_update: bool = False) -> ExamAttempt | None:
    stmt = (
        select(ExamAttempt)
        .where(ExamAttempt.id == attempt_id)
        .options(*_attempt_load_options())
        .execution_options(populate_existing=True)
    )
    if for_update:
        stmt = stmt.with_for_update(of=ExamAttempt)
    return await db.scalar(stmt)


async def load_attempt(db: AsyncSession, attempt_id: str) -> ExamAttempt:
    attempt = await _load_attempt(db, attempt_id)
    if attempt is None:
        raise AppError(404, "NOT_FOUND", "Attempt not found")
    return attempt


def _assert_student_owns(student_id: str, attempt: ExamAttempt) -> None:
    if attempt.assignment.student_id != student_id:
        raise AppError(403, "FORBIDDEN", "You do not own this attempt")


def _exam_questions(attempt: ExamAttempt) -> list[ExamQuestion]:
    return sorted(attempt.assignment.exam.questions, key=lambda eq: eq.order_index)


def _student_questions(exam_questions: list[ExamQuestion]) -> list[dict[str, Any]]:
    """Student view of questions — options WITHOUT isCorrect."""
    return [
        {
            "id": eq.question.id,
            "orderIndex": eq.order_index,
            "content": eq.question.content,
            "points": num(eq.question.points),
            "options": [{"id": o.id, "label": o.label, "content": o.content} for o in eq.question.options],
        }
        for eq in exam_questions
    ]


def _answers_map(answers: list[AttemptAnswer]) -> dict[str, str | None]:
    return {a.question_id: a.selected_option_id for a in answers}


def _in_progress_payload(attempt: ExamAttempt) -> dict[str, Any]:
    return {
        "attemptId": attempt.id,
        "examTitle": attempt.assignment.exam.title,
        "expiresAt": iso(attempt.expires_at),
        "questions": _student_questions(_exam_questions(attempt)),
        "answers": _answers_map(attempt.answers),
    }


def _grade(attempt: ExamAttempt) -> dict[str, Any]:
    """Mark each answer correct/incorrect (in the session) and compute the score."""
    answers = {a.question_id: a for a in attempt.answers}
    score = Decimal(0)
    max_score = Decimal(0)
    correct_count = 0
    exam_questions = _exam_questions(attempt)

    for eq in exam_questions:
        question = eq.question
        max_score += question.points
        answer = answers.get(question.id)
        correct = next((o for o in question.options if o.is_correct), None)
        is_correct = bool(
            answer is not None
            and answer.selected_option_id
            and correct is not None
            and answer.selected_option_id == correct.id
        )
        if is_correct:
            score += question.points
            correct_count += 1
        if answer is not None:
            answer.is_correct = is_correct

    return {
        "score": score,
        "maxScore": max_score,
        "correctCount": correct_count,
        "totalQuestions": len(exam_questions),
    }


def _review(attempt: ExamAttempt, show_answers: bool) -> list[dict[str, Any]]:
    if not show_answers:
        return []

    answers = {a.question_id: a for a in attempt.answers}
    review = []
    for eq in _exam_questions(attempt):
        question = eq.question
        answer = answers.get(question.id)
        correct = next((o for o in question.options if o.is_correct), None)
        selected = None
        if answer is not None and answer.selected_option_id:
            selected = next((o for o in question.options if o.id == answer.selected_option_id), None)
        review.append(
            {
                "questionId": question.id,
                "content": question.content,
                "selectedOptionId": answer.selected_option_id if answer else None,
                "selectedOption": (
                    {"id": selected.id, "label": selected.label, "content": selected.content}
                    if selected
                    else None
                ),
                "correctOptionId": correct.id if correct else None,
                "correctOption": (
                    {"id": correct.id, "label": correct.label, "content": correct.content}
                    if correct
                    else None
                ),
                "isCorrect": bool(answer.is_correct) if answer and answer.is_correct is not None else False,
                "points": num(question.points),
            }
        )
    return review


async def _expire_if_needed(db: AsyncSession, attempt: ExamAttempt) -> ExamAttempt:
    """Auto-submit an IN_PROGRESS attempt whose time is up (status → EXPIRED)."""
    if attempt.status != "IN_PROGRESS" or utcnow() <= attempt.expires_at:
        return attempt

    fresh = await _load_attempt(db, attempt.id, for_update=True)
    if fresh is not None and fresh.status == "IN_PROGRESS":
        graded = _grade(fresh)
        fresh.status = "EXPIRED"
        fresh.submitted_at = fresh.expires_at
        fresh.score = graded["score"]
        fresh.max_score = graded["maxScore"]
    await db.commit()
    return await load_attempt(db, attempt.id)


async def list_my_exams(db: AsyncSession, student_id: str) -> list[dict[str, Any]]:
    stmt = (
        select(ExamAssignment)
        .where(ExamAssignment.student_id == student_id)
        .options(
            selectinload(ExamAssignment.exam).selectinload(Exam.subject),
            selectinload(ExamAssignment.attempts),
        )
        .order_by(ExamAssignment.assigned_at.desc())
    )
    result = []
    for a in (await db.scalars(stmt)).all():
        attempts = sorted(a.attempts, key=lambda at: at.started_at, reverse=True)
        used = sum(1 for at in attempts if at.status in DONE_STATUSES)
        in_progress = next((at for at in attempts if at.status == "IN_PROGRESS"), None)
        submitted = [at for at in attempts if at.status == "SUBMITTED"]
        last_completed = next((at for at in attempts if at.status in DONE_STATUSES), None)
        best = max((at.score if at.score is not None else Decimal(0) for at in submitted), default=None)
        if best is not None and best < 0:
            best = Decimal(0)

        result.append(
            {
                "assignmentId": a.id,
                "exam": {
                    "id": a.exam.id,
                    "title": a.exam.title,
                    "subjectName": a.exam.subject.name,
                    "status": a.exam.status,
                    "durationMinutes": a.exam.duration_minutes,
                    "openAt": iso(a.exam.open_at),
                    "closeAt": iso(a.exam.close_at),
                },
                "attemptCount": used,
                "maxAttempts": a.exam.max_attempts,
                "hasInProgress": in_progress is not None,
                "inProgressAttemptId": in_progress.id if in_progress else None,
                "lastCompletedAttemptId": last_completed.id if last_completed else None,
                "bestScore": num(best) if submitted else None,
                "lastAttemptStatus": attempts[0].status if attempts else None,
            }
        )
    return result


async def start_attempt(db: AsyncSession, student_id: str, body: StartAttemptBody) -> dict[str, Any]:
    stmt = (
        select(ExamAssignment)
        .where(ExamAssignment.id == body.assignmentId)
        .options(
            selectinload(ExamAssignment.exam).selectinload(Exam.questions).selectinload(ExamQuestion.question),
            selectinload(ExamAssignment.attempts),
        )
        .execution_options(populate_existing=True)
    )
    assignment = await db.scalar(stmt)
    if assignment is None:
        raise AppError(404, "NOT_FOUND", "Assignment not found")
    if assignment.student_id != student_id:
        raise AppError(403, "FORBIDDEN", "This exam is not assigned to you")

    exam = assignment.exam
    now = utcnow()
    if exam.status != "PUBLISHED":
        raise AppError(400, "EXAM_NOT_AVAILABLE", "Exam is not available")
    if now < exam.open_at or now > exam.close_at:
        raise AppError(400, "EXAM_NOT_AVAILABLE", "Exam is outside the availability window")
    if any(a.status == "IN_PROGRESS" for a in assignment.attempts):
        raise AppError(409, "ATTEMPT_IN_PROGRESS", "You already have an active attempt")
    if sum(1 for a in assignment.attempts if a.status in DONE_STATUSES) >= exam.max_attempts:
        raise AppError(400, "MAX_ATTEMPTS_REACHED", "No attempts remaining")
    if not exam.questions:
        raise AppError(400, "EXAM_NOT_AVAILABLE", "Exam has no questions")

    exam_questions = sorted(exam.questions, key=lambda eq: eq.order_index)
    attempt = ExamAttempt(
        assignment_id=assignment.id,
        started_at=now,
        expires_at=minutes_later(now, exam.duration_minutes),
        max_score=sum((eq.question.points for eq in exam_questions), Decimal(0)),
        status="IN_PROGRESS",
    )
    db.add(attempt)
    await db.flush()
    db.add_all(
        AttemptAnswer(attempt_id=attempt.id, question_id=eq.question_id, selected_option_id=None)
        for eq in exam_questions
    )
    await db.commit()

    return _in_progress_payload(await load_attempt(db, attempt.id))


async def get_attempt(db: AsyncSession, student_id: str, attempt_id: str) -> dict[str, Any]:
    attempt = await load_attempt(db, attempt_id)
    _assert_student_owns(student_id, attempt)
    attempt = await _expire_if_needed(db, attempt)
    if attempt.status != "IN_PROGRESS":
        raise AppError(400, "VALIDATION_ERROR", "Attempt is not in progress")
    return _in_progress_payload(attempt)


async def save_answers(
    db: AsyncSession, student_id: str, attempt_id: str, body: SaveAnswersBody
) -> dict[str, Any]:
    attempt = await load_attempt(db, attempt_id)
    _assert_student_owns(student_id, attempt)
    attempt = await _expire_if_needed(db, attempt)

    if attempt.status == "EXPIRED":
        raise AppError(400, "ATTEMPT_EXPIRED", "Attempt has expired")
    if attempt.status != "IN_PROGRESS":
        raise AppError(400, "VALIDATION_ERROR", "Attempt is not in progress")

    options_by_question = {
        eq.question_id: {o.id for o in eq.question.options} for eq in attempt.assignment.exam.questions
    }
    for answer in body.answers:
        if answer.questionId not in options_by_question:
            raise AppError(400, "VALIDATION_ERROR", "Invalid question for this attempt")
        if answer.selectedOptionId and answer.selectedOptionId not in options_by_question[answer.questionId]:
            raise AppError(400, "VALIDATION_ERROR", "Invalid option for this question")

    rows = {a.question_id: a for a in attempt.answers}
    for answer in body.answers:
        row = rows.get(answer.questionId)
        if row is not None:
            row.selected_option_id = answer.selectedOptionId
    await db.commit()

    return await get_attempt(db, student_id, attempt_id)


async def submit_attempt(db: AsyncSession, student_id: str, attempt_id: str) -> dict[str, Any]:
    attempt = await load_attempt(db, attempt_id)
    _assert_student_owns(student_id, attempt)

    if attempt.status == "SUBMITTED":
        raise AppError(409, "VALIDATION_ERROR", "Attempt has already been submitted")

    attempt = await _expire_if_needed(db, attempt)
    if attempt.status == "EXPIRED":
        raise AppError(400, "ATTEMPT_EXPIRED", "Attempt has expired")
    if attempt.status != "IN_PROGRESS":
        raise AppError(400, "VALIDATION_ERROR", "Attempt is not in progress")

    show_review = attempt.assignment.exam.show_answers_after_submit
    submitted_at = utcnow()

    # Lock the row so a concurrent second submit waits and then sees SUBMITTED (→ 409).
    fresh = await _load_attempt(db, attempt_id, for_update=True)
    if fresh is None or fresh.status != "IN_PROGRESS":
        await db.rollback()
        raise AppError(409, "VALIDATION_ERROR", "Attempt has already been submitted")

    graded = _grade(fresh)
    fresh.status = "SUBMITTED"
    fresh.submitted_at = submitted_at
    fresh.score = graded["score"]
    fresh.max_score = graded["maxScore"]
    await db.commit()

    updated = await load_attempt(db, attempt_id)
    return {
        "score": num(graded["score"]),
        "maxScore": num(graded["maxScore"]),
        "correctCount": graded["correctCount"],
        "totalQuestions": graded["totalQuestions"],
        "submittedAt": iso(submitted_at),
        "review": _review(updated, show_review),
    }


def _assert_result_available(attempt: ExamAttempt) -> None:
    if attempt.status not in DONE_STATUSES:
        raise AppError(400, "VALIDATION_ERROR", "Result is not available yet")


async def get_attempt_result(db: AsyncSession, student_id: str, attempt_id: str) -> dict[str, Any]:
    attempt = await load_attempt(db, attempt_id)
    _assert_student_owns(student_id, attempt)
    _assert_result_available(attempt)

    exam = attempt.assignment.exam
    return {
        "attemptId": attempt.id,
        "examTitle": exam.title,
        "status": attempt.status,
        "score": num(attempt.score) if attempt.score is not None else 0,
        "maxScore": num(attempt.max_score),
        "correctCount": sum(1 for a in attempt.answers if a.is_correct),
        "totalQuestions": len(exam.questions),
        "submittedAt": iso(attempt.submitted_at),
        "review": _review(attempt, exam.show_answers_after_submit),
    }


async def get_attempt_result_for_teacher(
    db: AsyncSession, teacher_id: str, exam_id: str, attempt_id: str
) -> dict[str, Any]:
    attempt = await load_attempt(db, attempt_id)
    exam = attempt.assignment.exam
    if exam.id != exam_id:
        raise AppError(404, "NOT_FOUND", "Attempt not found")
    if exam.created_by != teacher_id:
        raise AppError(403, "FORBIDDEN", "You do not have access to this attempt")
    _assert_result_available(attempt)

    student = await db.get(User, attempt.assignment.student_id)
    if student is None:
        raise AppError(404, "NOT_FOUND", "Student not found")

    return {
        "attemptId": attempt.id,
        "examTitle": exam.title,
        "studentId": student.id,
        "studentName": student.full_name,
        "studentEmail": student.email,
        "status": attempt.status,
        "score": num(attempt.score) if attempt.score is not None else 0,
        "maxScore": num(attempt.max_score),
        "correctCount": sum(1 for a in attempt.answers if a.is_correct),
        "totalQuestions": len(exam.questions),
        "submittedAt": iso(attempt.submitted_at),
        "review": _review(attempt, True),
    }
