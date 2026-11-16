"""Idempotent sample data (same records as the Node seed). Safe to run repeatedly.

    python -m app.seed
"""

from __future__ import annotations

import asyncio
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from .db import make_engine
from .models import (
    AttemptAnswer,
    Exam,
    ExamAssignment,
    ExamAttempt,
    ExamQuestion,
    Question,
    QuestionOption,
    Subject,
    User,
)
from .seed_data import *  # noqa: F403 — seed constants
from .seed_data import (
    BULK_QUESTIONS,
    BULK_SUBJECTS,
    SEED_ALL_QUESTION_IDS,
    SEED_EXTRA_ASSIGNMENT_IDS,
    SEED_EXTRA_ATTEMPT_IDS,
    SEED_EXTRA_EXAM_IDS,
    SEED_EXTRA_STUDENT_IDS,
    SEED_EXTRA_TEACHER_IDS,
    SEED_PASSWORD,
    SEED_USERS,
)
from .security import hash_password
from .utils import utcnow

DAY = timedelta(days=1)
HOUR = timedelta(hours=1)


async def _upsert(conn: AsyncConnection, model, values: dict, conflict: list[str], update: dict) -> None:
    stmt = pg_insert(model.__table__).values(**values)
    stmt = stmt.on_conflict_do_update(index_elements=conflict, set_=update)
    await conn.execute(stmt)


async def _seed_users(conn: AsyncConnection, password_hash: str, now) -> None:
    users = [
        (u["id"], u["email"], u["fullName"], u["role"], u.get("isActive", True)) for u in SEED_USERS.values()
    ]
    users += [(SEED_EXTRA_TEACHER_IDS[i], f"teacher{i + 3}@oex.test", f"Teacher {i + 3}", "TEACHER", True) for i in range(8)]
    users += [(SEED_EXTRA_STUDENT_IDS[i], f"student{i + 3}@oex.test", f"Student {i + 3}", "STUDENT", True) for i in range(8)]

    for user_id, email, full_name, role, active in users:
        update = {"password_hash": password_hash, "full_name": full_name, "role": role, "is_active": active, "updated_at": now}
        await _upsert(
            conn, User,
            {"id": user_id, "email": email, "created_at": now, **update},
            ["email"], update,
        )


async def _seed_subjects_and_questions(conn: AsyncConnection, now) -> None:
    for s in BULK_SUBJECTS:
        description = f"Seed subject: {s['name']}"
        await _upsert(
            conn, Subject,
            {"id": s["id"], "code": s["code"], "name": s["name"], "description": description,
             "teacher_id": s["teacherId"], "created_at": now, "updated_at": now},
            ["teacher_id", "code"],
            {"name": s["name"], "description": description, "updated_at": now},
        )

    for q in BULK_QUESTIONS:
        points = Decimal(q["points"])
        await _upsert(
            conn, Question,
            {"id": q["id"], "subject_id": SEED_SUBJECT_ID, "content": q["content"], "difficulty": q["difficulty"],
             "points": points, "created_by": SEED_TEACHER_ID, "created_at": now, "updated_at": now},
            ["id"],
            {"content": q["content"], "difficulty": q["difficulty"], "points": points, "updated_at": now},
        )
        await conn.execute(delete(QuestionOption).where(QuestionOption.question_id == q["id"]))
        await conn.execute(
            pg_insert(QuestionOption.__table__),
            [
                {"id": o["id"], "question_id": q["id"], "label": o["label"], "content": o["content"], "is_correct": o["isCorrect"]}
                for o in q["options"]
            ],
        )


EXAMS = [
    (SEED_DRAFT_EXAM_ID, "CS101 Draft Exam", "DRAFT", False),
    (SEED_PUBLISHED_EXAM_ID, "CS101 Midterm", "PUBLISHED", False),
    (SEED_CLOSED_EXAM_ID, "CS101 Final (Closed)", "CLOSED", True),
    (SEED_EXTRA_EXAM_IDS[0], "CS101 Quiz A", "PUBLISHED", False),
    (SEED_EXTRA_EXAM_IDS[1], "CS101 Quiz B", "PUBLISHED", False),
    (SEED_EXTRA_EXAM_IDS[2], "CS101 Practice Test", "DRAFT", False),
    (SEED_EXTRA_EXAM_IDS[3], "CS101 Mock Exam", "PUBLISHED", False),
    (SEED_EXTRA_EXAM_IDS[4], "CS101 Review Session", "CLOSED", True),
    (SEED_EXTRA_EXAM_IDS[5], "CS101 Lab Assessment", "DRAFT", False),
    (SEED_EXTRA_EXAM_IDS[6], "CS101 Supplemental Quiz", "PUBLISHED", False),
]

EXAM_QUESTION_LINKS = {
    SEED_PUBLISHED_EXAM_ID: SEED_ALL_QUESTION_IDS[0:3],
    SEED_EXTRA_EXAM_IDS[0]: SEED_ALL_QUESTION_IDS[3:6],
    SEED_EXTRA_EXAM_IDS[1]: SEED_ALL_QUESTION_IDS[6:9],
    SEED_EXTRA_EXAM_IDS[3]: SEED_ALL_QUESTION_IDS[0:5],
    SEED_EXTRA_EXAM_IDS[6]: SEED_ALL_QUESTION_IDS[5:10],
}

_STUDENTS = [SEED_STUDENT1_ID, SEED_STUDENT2_ID, *SEED_EXTRA_STUDENT_IDS]

ASSIGNMENTS = [
    (SEED_ASSIGNMENT1_ID, SEED_PUBLISHED_EXAM_ID, SEED_STUDENT1_ID),
    (SEED_ASSIGNMENT2_ID, SEED_PUBLISHED_EXAM_ID, SEED_STUDENT2_ID),
    (SEED_ASSIGNMENT_CLOSED_ID, SEED_CLOSED_EXAM_ID, SEED_STUDENT1_ID),
    (SEED_EXTRA_ASSIGNMENT_IDS[0], SEED_EXTRA_EXAM_IDS[0], _STUDENTS[2]),
    (SEED_EXTRA_ASSIGNMENT_IDS[1], SEED_EXTRA_EXAM_IDS[0], _STUDENTS[3]),
    (SEED_EXTRA_ASSIGNMENT_IDS[2], SEED_EXTRA_EXAM_IDS[0], _STUDENTS[4]),
    (SEED_EXTRA_ASSIGNMENT_IDS[3], SEED_EXTRA_EXAM_IDS[1], _STUDENTS[5]),
    (SEED_EXTRA_ASSIGNMENT_IDS[4], SEED_EXTRA_EXAM_IDS[1], _STUDENTS[6]),
    (SEED_EXTRA_ASSIGNMENT_IDS[5], SEED_EXTRA_EXAM_IDS[3], _STUDENTS[7]),
    (SEED_EXTRA_ASSIGNMENT_IDS[6], SEED_EXTRA_EXAM_IDS[6], _STUDENTS[8]),
]

# (attempt id, assignment id, status, score, max score, days ago)
EXTRA_ATTEMPTS = [
    (SEED_EXTRA_ATTEMPT_IDS[0], SEED_EXTRA_ASSIGNMENT_IDS[0], "SUBMITTED", 4, 6, 5),
    (SEED_EXTRA_ATTEMPT_IDS[1], SEED_EXTRA_ASSIGNMENT_IDS[1], "SUBMITTED", 3, 6, 4),
    (SEED_EXTRA_ATTEMPT_IDS[2], SEED_EXTRA_ASSIGNMENT_IDS[2], "EXPIRED", 2, 6, 6),
    (SEED_EXTRA_ATTEMPT_IDS[3], SEED_EXTRA_ASSIGNMENT_IDS[3], "SUBMITTED", 5, 6, 3),
    (SEED_EXTRA_ATTEMPT_IDS[4], SEED_EXTRA_ASSIGNMENT_IDS[4], "SUBMITTED", 6, 6, 2),
    (SEED_EXTRA_ATTEMPT_IDS[5], SEED_EXTRA_ASSIGNMENT_IDS[5], "IN_PROGRESS", None, 10, 0),
    (SEED_EXTRA_ATTEMPT_IDS[6], SEED_EXTRA_ASSIGNMENT_IDS[6], "SUBMITTED", 7, 10, 1),
    (SEED_EXTRA_ATTEMPT_IDS[7], SEED_EXTRA_ASSIGNMENT_IDS[0], "SUBMITTED", 5, 6, 1),
]


async def _seed_exams(conn: AsyncConnection, now) -> None:
    past_open, past_close, future_close = now - 7 * DAY, now - DAY, now + 30 * DAY
    for exam_id, title, status, closed_window in EXAMS:
        close_at = past_close if closed_window else future_close
        await _upsert(
            conn, Exam,
            {"id": exam_id, "subject_id": SEED_SUBJECT_ID, "title": title, "description": f"Seed exam: {title}",
             "duration_minutes": 60, "open_at": past_open, "close_at": close_at, "max_attempts": 2,
             "show_answers_after_submit": True, "status": status, "created_by": SEED_TEACHER_ID,
             "created_at": now, "updated_at": now},
            ["id"],
            {"title": title, "status": status, "open_at": past_open, "close_at": close_at, "updated_at": now},
        )

    for exam_id, question_ids in EXAM_QUESTION_LINKS.items():
        await conn.execute(delete(ExamQuestion).where(ExamQuestion.exam_id == exam_id))
        await conn.execute(
            pg_insert(ExamQuestion.__table__),
            [{"exam_id": exam_id, "question_id": qid, "order_index": i + 1} for i, qid in enumerate(question_ids)],
        )

    for assignment_id, exam_id, student_id in ASSIGNMENTS:
        await _upsert(
            conn, ExamAssignment,
            {"id": assignment_id, "exam_id": exam_id, "student_id": student_id,
             "assigned_by": SEED_TEACHER_ID, "assigned_at": now},
            ["exam_id", "student_id"],
            {"assigned_by": SEED_TEACHER_ID},
        )


async def _replace_answers(conn: AsyncConnection, attempt_id: str, rows: list[dict]) -> None:
    await conn.execute(delete(AttemptAnswer).where(AttemptAnswer.attempt_id == attempt_id))
    if rows:
        await conn.execute(
            pg_insert(AttemptAnswer.__table__),
            [{"id": new_answer_id(), "attempt_id": attempt_id, **r} for r in rows],
        )


def new_answer_id() -> str:
    from .models import new_id

    return new_id()


async def _seed_attempts(conn: AsyncConnection, now) -> None:
    # Remove stray attempts on the two core assignments (keep the stable seed ones).
    await conn.execute(
        delete(ExamAttempt).where(
            ExamAttempt.assignment_id.in_([SEED_ASSIGNMENT1_ID, SEED_ASSIGNMENT2_ID]),
            ExamAttempt.id.not_in([SEED_ATTEMPT_SUBMITTED_ID, SEED_ATTEMPT_EXPIRED_ID]),
        )
    )

    submitted_started = now - 3 * DAY
    submitted_at = submitted_started + timedelta(minutes=30)
    await _upsert(
        conn, ExamAttempt,
        {"id": SEED_ATTEMPT_SUBMITTED_ID, "assignment_id": SEED_ASSIGNMENT2_ID, "started_at": submitted_started,
         "expires_at": submitted_started + HOUR, "submitted_at": submitted_at, "score": Decimal(2),
         "max_score": Decimal(4), "status": "SUBMITTED"},
        ["id"],
        {"status": "SUBMITTED", "score": Decimal(2), "max_score": Decimal(4), "submitted_at": submitted_at},
    )
    await _replace_answers(conn, SEED_ATTEMPT_SUBMITTED_ID, [
        {"question_id": SEED_QUESTION1_ID, "selected_option_id": SEED_Q1_OPT_B_ID, "is_correct": True},
        {"question_id": SEED_QUESTION2_ID, "selected_option_id": SEED_Q2_OPT_A_ID, "is_correct": False},
        {"question_id": SEED_QUESTION3_ID, "selected_option_id": SEED_Q3_OPT_B_ID, "is_correct": True},
    ])

    expired_started = now - 2 * DAY
    expired_at = expired_started + HOUR
    await _upsert(
        conn, ExamAttempt,
        {"id": SEED_ATTEMPT_EXPIRED_ID, "assignment_id": SEED_ASSIGNMENT1_ID, "started_at": expired_started,
         "expires_at": expired_at, "submitted_at": expired_at, "score": Decimal(1), "max_score": Decimal(4),
         "status": "EXPIRED"},
        ["id"],
        {"status": "EXPIRED", "score": Decimal(1), "max_score": Decimal(4), "expires_at": expired_at},
    )
    await _replace_answers(conn, SEED_ATTEMPT_EXPIRED_ID, [
        {"question_id": SEED_QUESTION1_ID, "selected_option_id": SEED_Q1_OPT_B_ID, "is_correct": True},
        {"question_id": SEED_QUESTION2_ID, "selected_option_id": None, "is_correct": False},
        {"question_id": SEED_QUESTION3_ID, "selected_option_id": None, "is_correct": False},
    ])

    exam_of_assignment = {a_id: exam_id for a_id, exam_id, _ in ASSIGNMENTS}
    questions = {q["id"]: q for q in BULK_QUESTIONS}
    for attempt_id, assignment_id, status, score, max_score, days_ago in EXTRA_ATTEMPTS:
        started = now - days_ago * DAY
        expires = started + HOUR
        done = status in ("SUBMITTED", "EXPIRED")
        score_dec = Decimal(score) if score is not None else None
        await _upsert(
            conn, ExamAttempt,
            {"id": attempt_id, "assignment_id": assignment_id, "started_at": started, "expires_at": expires,
             "submitted_at": expires if done else None, "score": score_dec, "max_score": Decimal(max_score),
             "status": status},
            ["id"],
            {"status": status, "score": score_dec, "max_score": Decimal(max_score),
             "submitted_at": expires if done else None},
        )
        if not done:
            await _replace_answers(conn, attempt_id, [])
            continue

        question_ids = EXAM_QUESTION_LINKS.get(exam_of_assignment[assignment_id], SEED_ALL_QUESTION_IDS[0:3])
        rows = []
        for qi, qid in enumerate(question_ids):
            options = questions[qid]["options"]
            pick_correct = qi % 2 == 0
            chosen = next(o for o in options if o["isCorrect"] == pick_correct)
            rows.append({"question_id": qid, "selected_option_id": chosen["id"], "is_correct": pick_correct})
        await _replace_answers(conn, attempt_id, rows)


TABLES = [
    ("users", User), ("subjects", Subject), ("questions", Question), ("question_options", QuestionOption),
    ("exams", Exam), ("exam_questions", ExamQuestion), ("exam_assignments", ExamAssignment),
    ("exam_attempts", ExamAttempt), ("attempt_answers", AttemptAnswer),
]


async def seed(database_url: str | None = None, *, verbose: bool = True) -> None:
    engine = make_engine(database_url)
    try:
        now = utcnow()
        password_hash = hash_password(SEED_PASSWORD)
        async with engine.begin() as conn:
            await _seed_users(conn, password_hash, now)
            await _seed_subjects_and_questions(conn, now)
            await _seed_exams(conn, now)
            await _seed_attempts(conn, now)

        async with engine.connect() as conn:
            counts = {name: await conn.scalar(select(func.count()).select_from(model)) for name, model in TABLES}
        if verbose:
            print("Seed record counts:")
            for name, count in counts.items():
                print(f"  {name}: {count}")
        below = {n: c for n, c in counts.items() if c < 10}
        if below:
            raise RuntimeError(f"Seed below minimum (10): {below}")
    finally:
        await engine.dispose()


def main() -> None:
    from .config import get_settings

    asyncio.run(seed(get_settings().async_database_url))
    print("The seed command has been executed.")


if __name__ == "__main__":
    main()
