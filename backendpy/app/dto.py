"""Model → JSON-ready dict mappers (camelCase, ISO dates, numbers like the Node API)."""

from __future__ import annotations

from typing import Any

from .models import Exam, ExamAssignment, Question, Subject, User
from .utils import iso, num


def public_user(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role,
        "isActive": user.is_active,
        "createdAt": iso(user.created_at),
        "updatedAt": iso(user.updated_at),
    }


def auth_profile(user: User) -> dict[str, Any]:
    return {"id": user.id, "email": user.email, "fullName": user.full_name, "role": user.role}


def student_brief(user: User) -> dict[str, Any]:
    return {"id": user.id, "email": user.email, "fullName": user.full_name}


def subject_dto(subject: Subject) -> dict[str, Any]:
    return {
        "id": subject.id,
        "code": subject.code,
        "name": subject.name,
        "description": subject.description,
        "teacherId": subject.teacher_id,
        "createdAt": iso(subject.created_at),
        "updatedAt": iso(subject.updated_at),
    }


def question_dto(question: Question) -> dict[str, Any]:
    """Teacher view — includes isCorrect. Requires `options` loaded."""
    return {
        "id": question.id,
        "subjectId": question.subject_id,
        "content": question.content,
        "difficulty": question.difficulty,
        "points": num(question.points),
        "createdBy": question.created_by,
        "createdAt": iso(question.created_at),
        "updatedAt": iso(question.updated_at),
        "options": [
            {"id": o.id, "label": o.label, "content": o.content, "isCorrect": o.is_correct}
            for o in question.options
        ],
    }


def exam_dto(exam: Exam) -> dict[str, Any]:
    return {
        "id": exam.id,
        "subjectId": exam.subject_id,
        "title": exam.title,
        "description": exam.description,
        "durationMinutes": exam.duration_minutes,
        "openAt": iso(exam.open_at),
        "closeAt": iso(exam.close_at),
        "maxAttempts": exam.max_attempts,
        "showAnswersAfterSubmit": exam.show_answers_after_submit,
        "status": exam.status,
        "createdBy": exam.created_by,
        "createdAt": iso(exam.created_at),
        "updatedAt": iso(exam.updated_at),
    }


def assignment_dto(assignment: ExamAssignment, student: User) -> dict[str, Any]:
    return {
        "id": assignment.id,
        "studentId": assignment.student_id,
        "student": student_brief(student),
        "assignedAt": iso(assignment.assigned_at),
    }


def exam_detail_dto(exam: Exam) -> dict[str, Any]:
    """Requires questions→question→options and assignments→student loaded."""
    result = exam_dto(exam)
    result["questions"] = [
        {
            "orderIndex": eq.order_index,
            "question": {
                "id": eq.question.id,
                "content": eq.question.content,
                "difficulty": eq.question.difficulty,
                "points": num(eq.question.points),
                "options": [
                    {"id": o.id, "label": o.label, "content": o.content, "isCorrect": o.is_correct}
                    for o in eq.question.options
                ],
            },
        }
        for eq in sorted(exam.questions, key=lambda eq: eq.order_index)
    ]
    result["assignments"] = [assignment_dto(a, a.student) for a in exam.assignments]
    return result
