"""Direct DB tweaks used by tests (same as backend/tests/helpers/db.ts)."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import delete, update

from app.models import ExamAttempt
from app.seed_data import (
    SEED_ASSIGNMENT1_ID,
    SEED_ASSIGNMENT2_ID,
    SEED_ATTEMPT_EXPIRED_ID,
    SEED_ATTEMPT_SUBMITTED_ID,
)
from app.utils import utcnow

from .conftest import run_db


def set_attempt_expired(attempt_id: str) -> None:
    async def _fn(conn):
        await conn.execute(
            update(ExamAttempt)
            .where(ExamAttempt.id == attempt_id)
            .values(expires_at=utcnow() - timedelta(minutes=1))
        )

    run_db(_fn)


def reset_seed_assignment_attempts() -> None:
    """Remove stray attempts from prior runs; keep the stable seed attempts."""

    async def _fn(conn):
        await conn.execute(
            delete(ExamAttempt).where(
                ExamAttempt.assignment_id.in_([SEED_ASSIGNMENT1_ID, SEED_ASSIGNMENT2_ID]),
                ExamAttempt.id.not_in([SEED_ATTEMPT_SUBMITTED_ID, SEED_ATTEMPT_EXPIRED_ID]),
            )
        )

    run_db(_fn)
