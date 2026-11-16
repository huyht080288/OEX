"""HTTP layer: parse/validate the request, call a service, wrap the result in the envelope."""

from fastapi import APIRouter

from . import attempts, auth, exams, questions, students, subjects, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(subjects.router)
api_router.include_router(questions.router)
api_router.include_router(exams.router)
api_router.include_router(attempts.my_exams_router)
api_router.include_router(attempts.router)
api_router.include_router(students.router)
