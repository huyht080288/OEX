"""Baseline schema — identical to the Prisma init migration (0001_init.sql).

If the tables already exist (database created by the Node/Prisma backend), the
migration is a no-op, so both backends can share one database.

Revision ID: 0001_init
Revises:
Create Date: 2026-11-16
"""

from __future__ import annotations

from pathlib import Path

import sqlalchemy as sa
from alembic import op

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None

SQL_FILE = Path(__file__).with_suffix(".sql")


def _statements() -> list[str]:
    lines = [ln for ln in SQL_FILE.read_text(encoding="utf-8").splitlines() if not ln.startswith("--")]
    return [s.strip() for s in "\n".join(lines).split(";") if s.strip()]


def upgrade() -> None:
    bind = op.get_bind()
    if sa.inspect(bind).has_table("users"):
        return
    for statement in _statements():
        op.execute(statement)


def downgrade() -> None:
    for table in (
        "attempt_answers",
        "exam_attempts",
        "exam_assignments",
        "exam_questions",
        "exams",
        "question_options",
        "questions",
        "subjects",
        "users",
    ):
        op.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
    for enum in ("AttemptStatus", "ExamStatus", "Difficulty", "Role"):
        op.execute(f'DROP TYPE IF EXISTS "{enum}"')
