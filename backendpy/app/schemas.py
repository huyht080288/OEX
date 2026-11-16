"""Request validation (Pydantic v2) — mirrors the zod validators of the Node backend.

Models are strict (no "5" → 5 coercion) and use camelCase field names like the API.
Optional non-nullable fields default to None without validation, so an explicit
`null` is rejected while an omitted field is allowed — same as zod `.optional()`.
Use `model.model_fields_set` to know which fields the client actually sent.
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator
from pydantic_core import PydanticCustomError

from .utils import EMAIL_PATTERN, ISO_UTC_PATTERN, UUID_PATTERN, parse_iso_utc

Uuid = Annotated[str, Field(pattern=UUID_PATTERN)]
Email = Annotated[str, Field(pattern=EMAIL_PATTERN)]
IsoDateTime = Annotated[str, Field(pattern=ISO_UTC_PATTERN.pattern)]
Role = Literal["ADMIN", "TEACHER", "STUDENT"]
Difficulty = Literal["EASY", "MEDIUM", "HARD"]
PositiveInt = Annotated[int, Field(gt=0)]
Points = Annotated[float, Field(gt=0, le=999.99)]


class StrictModel(BaseModel):
    # python-re: the email pattern (same as zod) uses look-ahead, unsupported by the Rust engine.
    model_config = ConfigDict(strict=True, extra="ignore", regex_engine="python-re")


def _check_window(open_at: str | None, close_at: str | None) -> None:
    if open_at and close_at and parse_iso_utc(close_at) <= parse_iso_utc(open_at):
        raise PydanticCustomError("window", "closeAt must be after openAt")


# ---------- auth ----------


class LoginBody(StrictModel):
    email: Email
    password: Annotated[str, Field(min_length=1)]


class ChangePasswordBody(StrictModel):
    currentPassword: Annotated[str, Field(min_length=1)]
    newPassword: Annotated[str, Field(min_length=8)]


# ---------- users ----------


class CreateUserBody(StrictModel):
    email: Email
    password: Annotated[str, Field(min_length=8)]
    fullName: Annotated[str, Field(min_length=1, max_length=255)]
    role: Role


class UpdateUserBody(StrictModel):
    email: Email = None  # type: ignore[assignment]
    fullName: Annotated[str, Field(min_length=1, max_length=255)] = None  # type: ignore[assignment]
    role: Role = None  # type: ignore[assignment]


class UpdateUserStatusBody(StrictModel):
    isActive: bool


class ListUsersQuery(StrictModel):
    role: Role | None = None
    search: str | None = None


class SearchQuery(StrictModel):
    search: str | None = None


# ---------- subjects ----------


class CreateSubjectBody(StrictModel):
    code: Annotated[str, Field(min_length=1, max_length=50)]
    name: Annotated[str, Field(min_length=1, max_length=255)]
    description: str = None  # type: ignore[assignment]


class UpdateSubjectBody(StrictModel):
    code: Annotated[str, Field(min_length=1, max_length=50)] = None  # type: ignore[assignment]
    name: Annotated[str, Field(min_length=1, max_length=255)] = None  # type: ignore[assignment]
    description: str | None = None


# ---------- questions ----------


class OptionBody(StrictModel):
    label: Annotated[str, Field(min_length=1, max_length=1)]
    content: Annotated[str, Field(min_length=1)]
    isCorrect: bool


Options = Annotated[list[OptionBody], Field(min_length=2, max_length=6)]


class CreateQuestionBody(StrictModel):
    subjectId: Uuid
    content: Annotated[str, Field(min_length=1)]
    difficulty: Difficulty
    points: Points
    options: Options


class UpdateQuestionBody(StrictModel):
    content: Annotated[str, Field(min_length=1)] = None  # type: ignore[assignment]
    difficulty: Difficulty = None  # type: ignore[assignment]
    points: Points = None  # type: ignore[assignment]
    options: Options = None  # type: ignore[assignment]


class ListQuestionsQuery(StrictModel):
    subjectId: Uuid | None = None
    difficulty: Difficulty | None = None
    q: str | None = None


# ---------- exams ----------


class CreateExamBody(StrictModel):
    subjectId: Uuid
    title: Annotated[str, Field(min_length=1, max_length=255)]
    description: str = None  # type: ignore[assignment]
    durationMinutes: PositiveInt
    openAt: IsoDateTime
    closeAt: IsoDateTime
    maxAttempts: PositiveInt = 1
    showAnswersAfterSubmit: bool = False

    @field_validator("closeAt")
    @classmethod
    def _close_after_open(cls, value: str, info: ValidationInfo) -> str:
        _check_window(info.data.get("openAt"), value)
        return value


class UpdateExamBody(StrictModel):
    title: Annotated[str, Field(min_length=1, max_length=255)] = None  # type: ignore[assignment]
    description: str | None = None
    durationMinutes: PositiveInt = None  # type: ignore[assignment]
    openAt: IsoDateTime = None  # type: ignore[assignment]
    closeAt: IsoDateTime = None  # type: ignore[assignment]
    maxAttempts: PositiveInt = None  # type: ignore[assignment]
    showAnswersAfterSubmit: bool = None  # type: ignore[assignment]

    @field_validator("closeAt")
    @classmethod
    def _close_after_open(cls, value: str, info: ValidationInfo) -> str:
        _check_window(info.data.get("openAt"), value)
        return value


class SetExamQuestionsBody(StrictModel):
    questionIds: Annotated[list[Uuid], Field(min_length=1)]


class UpdateExamStatusBody(StrictModel):
    status: Literal["PUBLISHED", "CLOSED"]


class AssignStudentsBody(StrictModel):
    studentIds: Annotated[list[Uuid], Field(min_length=1)]


# ---------- attempts ----------


class StartAttemptBody(StrictModel):
    assignmentId: Uuid


class AnswerBody(StrictModel):
    questionId: Uuid
    selectedOptionId: Uuid | None


class SaveAnswersBody(StrictModel):
    answers: Annotated[list[AnswerBody], Field(min_length=1)]
