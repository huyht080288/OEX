"""ORM models — mirror the existing PostgreSQL schema (same tables as the Prisma schema).

Relationships use lazy="raise": every query must eager-load what it needs (async safety).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CHAR, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import ENUM, TIMESTAMP
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from .utils import utcnow

ROLES = ("ADMIN", "TEACHER", "STUDENT")
DIFFICULTIES = ("EASY", "MEDIUM", "HARD")
EXAM_STATUSES = ("DRAFT", "PUBLISHED", "CLOSED")
ATTEMPT_STATUSES = ("IN_PROGRESS", "SUBMITTED", "EXPIRED")

RoleEnum = ENUM(*ROLES, name="Role", create_type=False)
DifficultyEnum = ENUM(*DIFFICULTIES, name="Difficulty", create_type=False)
ExamStatusEnum = ENUM(*EXAM_STATUSES, name="ExamStatus", create_type=False)
AttemptStatusEnum = ENUM(*ATTEMPT_STATUSES, name="AttemptStatus", create_type=False)

Timestamp = TIMESTAMP(precision=3)


def new_id() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(Text, unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    full_name: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(RoleEnum)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(Timestamp, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(Timestamp, default=utcnow)


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    teacher_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(Timestamp, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(Timestamp, default=utcnow)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=new_id)
    subject_id: Mapped[str] = mapped_column(Text, ForeignKey("subjects.id"))
    content: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(DifficultyEnum)
    points: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("1"))
    created_by: Mapped[str] = mapped_column(Text, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(Timestamp, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(Timestamp, default=utcnow)

    subject: Mapped[Subject] = relationship(lazy="raise")
    options: Mapped[list[QuestionOption]] = relationship(
        lazy="raise", order_by="QuestionOption.label", passive_deletes=True
    )


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=new_id)
    question_id: Mapped[str] = mapped_column(Text, ForeignKey("questions.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(CHAR(1))
    content: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=new_id)
    subject_id: Mapped[str] = mapped_column(Text, ForeignKey("subjects.id"))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    open_at: Mapped[datetime] = mapped_column(Timestamp)
    close_at: Mapped[datetime] = mapped_column(Timestamp)
    max_attempts: Mapped[int] = mapped_column(Integer, default=1)
    show_answers_after_submit: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(ExamStatusEnum)
    created_by: Mapped[str] = mapped_column(Text, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(Timestamp, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(Timestamp, default=utcnow)

    subject: Mapped[Subject] = relationship(lazy="raise")
    questions: Mapped[list[ExamQuestion]] = relationship(
        lazy="raise", order_by="ExamQuestion.order_index", passive_deletes=True
    )
    assignments: Mapped[list[ExamAssignment]] = relationship(
        lazy="raise", order_by="ExamAssignment.assigned_at", passive_deletes=True, back_populates="exam"
    )


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    exam_id: Mapped[str] = mapped_column(
        Text, ForeignKey("exams.id", ondelete="CASCADE"), primary_key=True
    )
    question_id: Mapped[str] = mapped_column(Text, ForeignKey("questions.id"), primary_key=True)
    order_index: Mapped[int] = mapped_column(Integer)

    question: Mapped[Question] = relationship(lazy="raise")


class ExamAssignment(Base):
    __tablename__ = "exam_assignments"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=new_id)
    exam_id: Mapped[str] = mapped_column(Text, ForeignKey("exams.id", ondelete="CASCADE"))
    student_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id"))
    assigned_by: Mapped[str] = mapped_column(Text, ForeignKey("users.id"))
    assigned_at: Mapped[datetime] = mapped_column(Timestamp, default=utcnow)

    exam: Mapped[Exam] = relationship(lazy="raise", back_populates="assignments")
    student: Mapped[User] = relationship(lazy="raise", foreign_keys=[student_id])
    attempts: Mapped[list[ExamAttempt]] = relationship(lazy="raise", back_populates="assignment")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=new_id)
    assignment_id: Mapped[str] = mapped_column(Text, ForeignKey("exam_assignments.id"))
    started_at: Mapped[datetime] = mapped_column(Timestamp)
    expires_at: Mapped[datetime] = mapped_column(Timestamp)
    submitted_at: Mapped[datetime | None] = mapped_column(Timestamp, nullable=True)
    score: Mapped[Decimal | None] = mapped_column(Numeric(7, 2), nullable=True)
    max_score: Mapped[Decimal] = mapped_column(Numeric(7, 2))
    status: Mapped[str] = mapped_column(AttemptStatusEnum)

    assignment: Mapped[ExamAssignment] = relationship(lazy="raise", back_populates="attempts")
    answers: Mapped[list[AttemptAnswer]] = relationship(lazy="raise", passive_deletes=True)


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=new_id)
    attempt_id: Mapped[str] = mapped_column(
        Text, ForeignKey("exam_attempts.id", ondelete="CASCADE")
    )
    question_id: Mapped[str] = mapped_column(Text, ForeignKey("questions.id"))
    selected_option_id: Mapped[str | None] = mapped_column(
        Text, ForeignKey("question_options.id", ondelete="SET NULL"), nullable=True
    )
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
