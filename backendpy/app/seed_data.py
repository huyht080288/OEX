"""Stable seed IDs and definitions — same values as src/backend/prisma/seed-data.ts."""

from __future__ import annotations


def seed_uuid(n: int) -> str:
    return f"00000000-0000-4000-8000-{n:012x}"


SEED_PASSWORD = "Password123!"  # dev/test only

SEED_ADMIN_ID = seed_uuid(0x001)
SEED_TEACHER_ID = seed_uuid(0x002)
SEED_STUDENT1_ID = seed_uuid(0x003)
SEED_STUDENT2_ID = seed_uuid(0x004)
SEED_INACTIVE_ID = seed_uuid(0x005)
SEED_TEACHER2_ID = seed_uuid(0x006)
SEED_EXTRA_TEACHER_IDS = [seed_uuid(0x007 + i) for i in range(8)]  # teacher3..10
SEED_EXTRA_STUDENT_IDS = [seed_uuid(0x080 + i) for i in range(8)]  # student3..10

SEED_SUBJECT_ID = seed_uuid(0x010)
SEED_SUBJECT_EMPTY_ID = seed_uuid(0x011)
SEED_SUBJECT2_ID = seed_uuid(0x012)
SEED_EXTRA_SUBJECT_IDS = [seed_uuid(0x013 + i) for i in range(7)]

SEED_QUESTION1_ID = seed_uuid(0x020)
SEED_QUESTION2_ID = seed_uuid(0x021)
SEED_QUESTION3_ID = seed_uuid(0x022)
SEED_EXTRA_QUESTION_IDS = [seed_uuid(0x023 + i) for i in range(7)]

SEED_DRAFT_EXAM_ID = seed_uuid(0x030)
SEED_PUBLISHED_EXAM_ID = seed_uuid(0x031)
SEED_CLOSED_EXAM_ID = seed_uuid(0x032)
SEED_EXTRA_EXAM_IDS = [seed_uuid(0x033 + i) for i in range(7)]

SEED_ASSIGNMENT1_ID = seed_uuid(0x040)
SEED_ASSIGNMENT2_ID = seed_uuid(0x041)
SEED_ASSIGNMENT_CLOSED_ID = seed_uuid(0x042)
SEED_EXTRA_ASSIGNMENT_IDS = [seed_uuid(0x043 + i) for i in range(7)]

SEED_Q1_OPT_A_ID, SEED_Q1_OPT_B_ID, SEED_Q1_OPT_C_ID, SEED_Q1_OPT_D_ID = (seed_uuid(0x050 + i) for i in range(4))
SEED_Q2_OPT_A_ID, SEED_Q2_OPT_B_ID, SEED_Q2_OPT_C_ID, SEED_Q2_OPT_D_ID = (seed_uuid(0x054 + i) for i in range(4))
SEED_Q3_OPT_A_ID, SEED_Q3_OPT_B_ID, SEED_Q3_OPT_C_ID, SEED_Q3_OPT_D_ID = (seed_uuid(0x058 + i) for i in range(4))

SEED_ATTEMPT_SUBMITTED_ID = seed_uuid(0x070)
SEED_ATTEMPT_EXPIRED_ID = seed_uuid(0x071)
SEED_EXTRA_ATTEMPT_IDS = [seed_uuid(0x072 + i) for i in range(8)]


def seed_question_option_ids(question_index: int) -> list[str]:
    base = 0x120 + question_index * 4
    return [seed_uuid(base + i) for i in range(4)]


SEED_USERS = {
    "admin": {"id": SEED_ADMIN_ID, "email": "admin@oex.test", "role": "ADMIN", "fullName": "Admin User"},
    "teacher": {"id": SEED_TEACHER_ID, "email": "teacher@oex.test", "role": "TEACHER", "fullName": "Teacher One"},
    "teacher2": {"id": SEED_TEACHER2_ID, "email": "teacher2@oex.test", "role": "TEACHER", "fullName": "Teacher Two"},
    "student1": {"id": SEED_STUDENT1_ID, "email": "student1@oex.test", "role": "STUDENT", "fullName": "Student One"},
    "student2": {"id": SEED_STUDENT2_ID, "email": "student2@oex.test", "role": "STUDENT", "fullName": "Student Two"},
    "inactive": {
        "id": SEED_INACTIVE_ID,
        "email": "inactive@oex.test",
        "role": "STUDENT",
        "fullName": "Inactive Student",
        "isActive": False,
    },
}

SEED_ALL_QUESTION_IDS = [SEED_QUESTION1_ID, SEED_QUESTION2_ID, SEED_QUESTION3_ID, *SEED_EXTRA_QUESTION_IDS]

BULK_SUBJECTS = [
    {"id": SEED_SUBJECT_ID, "code": "CS101", "name": "Introduction to Computer Science", "teacherId": SEED_TEACHER_ID},
    {"id": SEED_SUBJECT_EMPTY_ID, "code": "EMPTY", "name": "Empty Subject", "teacherId": SEED_TEACHER_ID},
    {"id": SEED_SUBJECT2_ID, "code": "MATH101", "name": "Mathematics 101", "teacherId": SEED_TEACHER2_ID},
    {"id": SEED_EXTRA_SUBJECT_IDS[0], "code": "CS102", "name": "Data Structures", "teacherId": SEED_TEACHER_ID},
    {"id": SEED_EXTRA_SUBJECT_IDS[1], "code": "CS103", "name": "Algorithms", "teacherId": SEED_TEACHER_ID},
    {"id": SEED_EXTRA_SUBJECT_IDS[2], "code": "PHY101", "name": "Physics Fundamentals", "teacherId": SEED_TEACHER_ID},
    {"id": SEED_EXTRA_SUBJECT_IDS[3], "code": "MATH102", "name": "Calculus II", "teacherId": SEED_TEACHER2_ID},
    {"id": SEED_EXTRA_SUBJECT_IDS[4], "code": "MATH103", "name": "Linear Algebra", "teacherId": SEED_TEACHER2_ID},
    {"id": SEED_EXTRA_SUBJECT_IDS[5], "code": "ENG101", "name": "Technical English", "teacherId": SEED_EXTRA_TEACHER_IDS[0]},
    {"id": SEED_EXTRA_SUBJECT_IDS[6], "code": "HIS101", "name": "World History", "teacherId": SEED_EXTRA_TEACHER_IDS[1]},
]


def _mcq(question_index: int, choices: list[str], correct_index: int) -> list[dict]:
    ids = seed_question_option_ids(question_index)
    return [
        {"id": ids[i], "label": "ABCD"[i], "content": text, "isCorrect": i == correct_index}
        for i, text in enumerate(choices)
    ]


def _options(ids: tuple[str, ...], choices: list[str], correct_index: int) -> list[dict]:
    return [
        {"id": ids[i], "label": "ABCD"[i], "content": text, "isCorrect": i == correct_index}
        for i, text in enumerate(choices)
    ]


BULK_QUESTIONS = [
    {
        "id": SEED_QUESTION1_ID,
        "content": "What is the capital of France?",
        "difficulty": "EASY",
        "points": 1,
        "options": _options(
            (SEED_Q1_OPT_A_ID, SEED_Q1_OPT_B_ID, SEED_Q1_OPT_C_ID, SEED_Q1_OPT_D_ID),
            ["London", "Paris", "Berlin", "Madrid"], 1,
        ),
    },
    {
        "id": SEED_QUESTION2_ID,
        "content": "Which planet is known as the Red Planet?",
        "difficulty": "MEDIUM",
        "points": 2,
        "options": _options(
            (SEED_Q2_OPT_A_ID, SEED_Q2_OPT_B_ID, SEED_Q2_OPT_C_ID, SEED_Q2_OPT_D_ID),
            ["Venus", "Mars", "Jupiter", "Saturn"], 1,
        ),
    },
    {
        "id": SEED_QUESTION3_ID,
        "content": "What is 2 + 2?",
        "difficulty": "EASY",
        "points": 1,
        "options": _options(
            (SEED_Q3_OPT_A_ID, SEED_Q3_OPT_B_ID, SEED_Q3_OPT_C_ID, SEED_Q3_OPT_D_ID),
            ["3", "4", "5", "22"], 1,
        ),
    },
    {
        "id": SEED_EXTRA_QUESTION_IDS[0],
        "content": "Which data structure uses FIFO order?",
        "difficulty": "MEDIUM",
        "points": 2,
        "options": _mcq(0, ["Stack", "Queue", "Tree", "Graph"], 1),
    },
    {
        "id": SEED_EXTRA_QUESTION_IDS[1],
        "content": "What does HTTP stand for?",
        "difficulty": "EASY",
        "points": 1,
        "options": _mcq(
            1,
            ["HyperText Transfer Protocol", "High Transfer Text Process", "Host Transfer Protocol", "Hyperlink Text Package"],
            0,
        ),
    },
    {
        "id": SEED_EXTRA_QUESTION_IDS[2],
        "content": "Which SQL clause filters rows?",
        "difficulty": "MEDIUM",
        "points": 2,
        "options": _mcq(2, ["ORDER BY", "WHERE", "GROUP BY", "JOIN"], 1),
    },
    {
        "id": SEED_EXTRA_QUESTION_IDS[3],
        "content": "What is the time complexity of binary search?",
        "difficulty": "HARD",
        "points": 3,
        "options": _mcq(3, ["O(n)", "O(log n)", "O(n²)", "O(1)"], 1),
    },
    {
        "id": SEED_EXTRA_QUESTION_IDS[4],
        "content": "Which layer is Vue Router part of in a SPA?",
        "difficulty": "EASY",
        "points": 1,
        "options": _mcq(4, ["Database", "Client routing", "SMTP", "Operating system"], 1),
    },
    {
        "id": SEED_EXTRA_QUESTION_IDS[5],
        "content": "What is a primary key in a relational database?",
        "difficulty": "MEDIUM",
        "points": 2,
        "options": _mcq(5, ["A duplicate column", "A unique row identifier", "A foreign index", "A backup table"], 1),
    },
    {
        "id": SEED_EXTRA_QUESTION_IDS[6],
        "content": 'Which HTTP status code means "Not Found"?',
        "difficulty": "EASY",
        "points": 1,
        "options": _mcq(6, ["200", "401", "404", "500"], 2),
    },
]
