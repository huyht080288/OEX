import { Role, Difficulty, ExamStatus, AttemptStatus } from '@prisma/client';

/** Minimum records per entity type in seed */
export const SEED_MIN_PER_TYPE = 10;

/** Stable UUID suffix (12 hex digits) for seed idempotency */
export function seedUuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
}

export const SEED_ADMIN_ID = seedUuid(0x001);
export const SEED_TEACHER_ID = seedUuid(0x002);
export const SEED_STUDENT1_ID = seedUuid(0x003);
export const SEED_STUDENT2_ID = seedUuid(0x004);
export const SEED_INACTIVE_ID = seedUuid(0x005);
export const SEED_TEACHER2_ID = seedUuid(0x006);

/** Teachers 3–10 (suffix 007–00e) */
export const SEED_EXTRA_TEACHER_IDS = Array.from({ length: 8 }, (_, i) => seedUuid(0x007 + i));

/** Students 3–10 (suffix 080–087) */
export const SEED_EXTRA_STUDENT_IDS = Array.from({ length: 8 }, (_, i) => seedUuid(0x080 + i));

export const SEED_SUBJECT_ID = seedUuid(0x010);
export const SEED_SUBJECT_EMPTY_ID = seedUuid(0x011);
export const SEED_SUBJECT2_ID = seedUuid(0x012);
/** Subjects 4–10 (suffix 013–019) */
export const SEED_EXTRA_SUBJECT_IDS = Array.from({ length: 7 }, (_, i) => seedUuid(0x013 + i));

export const SEED_QUESTION1_ID = seedUuid(0x020);
export const SEED_QUESTION2_ID = seedUuid(0x021);
export const SEED_QUESTION3_ID = seedUuid(0x022);
/** Questions 4–10 (suffix 023–029) */
export const SEED_EXTRA_QUESTION_IDS = Array.from({ length: 7 }, (_, i) => seedUuid(0x023 + i));

export const SEED_DRAFT_EXAM_ID = seedUuid(0x030);
export const SEED_PUBLISHED_EXAM_ID = seedUuid(0x031);
export const SEED_CLOSED_EXAM_ID = seedUuid(0x032);
/** Exams 4–10 (suffix 033–039) */
export const SEED_EXTRA_EXAM_IDS = Array.from({ length: 7 }, (_, i) => seedUuid(0x033 + i));

export const SEED_ASSIGNMENT1_ID = seedUuid(0x040);
export const SEED_ASSIGNMENT2_ID = seedUuid(0x041);
export const SEED_ASSIGNMENT_CLOSED_ID = seedUuid(0x042);
/** Assignments 4–10 (suffix 043–049) */
export const SEED_EXTRA_ASSIGNMENT_IDS = Array.from({ length: 7 }, (_, i) => seedUuid(0x043 + i));

export const SEED_Q1_OPT_A_ID = seedUuid(0x050);
export const SEED_Q1_OPT_B_ID = seedUuid(0x051);
export const SEED_Q1_OPT_C_ID = seedUuid(0x052);
export const SEED_Q1_OPT_D_ID = seedUuid(0x053);
export const SEED_Q2_OPT_A_ID = seedUuid(0x054);
export const SEED_Q2_OPT_B_ID = seedUuid(0x055);
export const SEED_Q2_OPT_C_ID = seedUuid(0x056);
export const SEED_Q2_OPT_D_ID = seedUuid(0x057);
export const SEED_Q3_OPT_A_ID = seedUuid(0x058);
export const SEED_Q3_OPT_B_ID = seedUuid(0x059);
export const SEED_Q3_OPT_C_ID = seedUuid(0x05a);
export const SEED_Q3_OPT_D_ID = seedUuid(0x05b);

/** Option IDs for questions 4–10 (4 options each, suffix 120–14b) */
export function seedQuestionOptionIds(questionIndex: number): [string, string, string, string] {
  const base = 0x120 + questionIndex * 4;
  return [seedUuid(base), seedUuid(base + 1), seedUuid(base + 2), seedUuid(base + 3)];
}

export const SEED_ATTEMPT_SUBMITTED_ID = seedUuid(0x070);
export const SEED_ATTEMPT_EXPIRED_ID = seedUuid(0x071);
/** Attempts 3–10 (suffix 072–079) */
export const SEED_EXTRA_ATTEMPT_IDS = Array.from({ length: 8 }, (_, i) => seedUuid(0x072 + i));

export const SEED_PASSWORD = 'Password123!';

export const SEED_USERS = {
  admin: { id: SEED_ADMIN_ID, email: 'admin@oex.test', role: Role.ADMIN, fullName: 'Admin User' },
  teacher: { id: SEED_TEACHER_ID, email: 'teacher@oex.test', role: Role.TEACHER, fullName: 'Teacher One' },
  teacher2: { id: SEED_TEACHER2_ID, email: 'teacher2@oex.test', role: Role.TEACHER, fullName: 'Teacher Two' },
  student1: { id: SEED_STUDENT1_ID, email: 'student1@oex.test', role: Role.STUDENT, fullName: 'Student One' },
  student2: { id: SEED_STUDENT2_ID, email: 'student2@oex.test', role: Role.STUDENT, fullName: 'Student Two' },
  inactive: {
    id: SEED_INACTIVE_ID,
    email: 'inactive@oex.test',
    role: Role.STUDENT,
    fullName: 'Inactive Student',
    isActive: false,
  },
} as const;

export const SEED_ALL_TEACHER_IDS = [SEED_TEACHER_ID, SEED_TEACHER2_ID, ...SEED_EXTRA_TEACHER_IDS];

export const SEED_ALL_STUDENT_IDS = [
  SEED_STUDENT1_ID,
  SEED_STUDENT2_ID,
  SEED_INACTIVE_ID,
  ...SEED_EXTRA_STUDENT_IDS,
];

export const SEED_ALL_SUBJECT_IDS = [
  SEED_SUBJECT_ID,
  SEED_SUBJECT_EMPTY_ID,
  SEED_SUBJECT2_ID,
  ...SEED_EXTRA_SUBJECT_IDS,
];

export const SEED_ALL_QUESTION_IDS = [
  SEED_QUESTION1_ID,
  SEED_QUESTION2_ID,
  SEED_QUESTION3_ID,
  ...SEED_EXTRA_QUESTION_IDS,
];

export const SEED_ALL_EXAM_IDS = [
  SEED_DRAFT_EXAM_ID,
  SEED_PUBLISHED_EXAM_ID,
  SEED_CLOSED_EXAM_ID,
  ...SEED_EXTRA_EXAM_IDS,
];

export const SEED_ALL_ASSIGNMENT_IDS = [
  SEED_ASSIGNMENT1_ID,
  SEED_ASSIGNMENT2_ID,
  SEED_ASSIGNMENT_CLOSED_ID,
  ...SEED_EXTRA_ASSIGNMENT_IDS,
];

export const SEED_ALL_ATTEMPT_IDS = [
  SEED_ATTEMPT_SUBMITTED_ID,
  SEED_ATTEMPT_EXPIRED_ID,
  ...SEED_EXTRA_ATTEMPT_IDS,
];

/** Bulk subject definitions (10 total including core 3) */
export const BULK_SUBJECTS = [
  { id: SEED_SUBJECT_ID, code: 'CS101', name: 'Introduction to Computer Science', teacherId: SEED_TEACHER_ID },
  { id: SEED_SUBJECT_EMPTY_ID, code: 'EMPTY', name: 'Empty Subject', teacherId: SEED_TEACHER_ID },
  { id: SEED_SUBJECT2_ID, code: 'MATH101', name: 'Mathematics 101', teacherId: SEED_TEACHER2_ID },
  { id: SEED_EXTRA_SUBJECT_IDS[0], code: 'CS102', name: 'Data Structures', teacherId: SEED_TEACHER_ID },
  { id: SEED_EXTRA_SUBJECT_IDS[1], code: 'CS103', name: 'Algorithms', teacherId: SEED_TEACHER_ID },
  { id: SEED_EXTRA_SUBJECT_IDS[2], code: 'PHY101', name: 'Physics Fundamentals', teacherId: SEED_TEACHER_ID },
  { id: SEED_EXTRA_SUBJECT_IDS[3], code: 'MATH102', name: 'Calculus II', teacherId: SEED_TEACHER2_ID },
  { id: SEED_EXTRA_SUBJECT_IDS[4], code: 'MATH103', name: 'Linear Algebra', teacherId: SEED_TEACHER2_ID },
  { id: SEED_EXTRA_SUBJECT_IDS[5], code: 'ENG101', name: 'Technical English', teacherId: SEED_EXTRA_TEACHER_IDS[0] },
  { id: SEED_EXTRA_SUBJECT_IDS[6], code: 'HIS101', name: 'World History', teacherId: SEED_EXTRA_TEACHER_IDS[1] },
] as const;

export interface SeedQuestionDef {
  id: string;
  content: string;
  difficulty: Difficulty;
  points: number;
  options: { id: string; label: string; content: string; isCorrect: boolean }[];
}

function mcqOptions(
  questionIndex: number,
  choices: [string, string, string, string],
  correctIndex: number,
) {
  const [a, b, c, d] = seedQuestionOptionIds(questionIndex);
  const ids = [a, b, c, d];
  const labels = ['A', 'B', 'C', 'D'];
  return choices.map((content, i) => ({
    id: ids[i],
    label: labels[i],
    content,
    isCorrect: i === correctIndex,
  }));
}

export const BULK_QUESTIONS: SeedQuestionDef[] = [
  {
    id: SEED_QUESTION1_ID,
    content: 'What is the capital of France?',
    difficulty: Difficulty.EASY,
    points: 1,
    options: [
      { id: SEED_Q1_OPT_A_ID, label: 'A', content: 'London', isCorrect: false },
      { id: SEED_Q1_OPT_B_ID, label: 'B', content: 'Paris', isCorrect: true },
      { id: SEED_Q1_OPT_C_ID, label: 'C', content: 'Berlin', isCorrect: false },
      { id: SEED_Q1_OPT_D_ID, label: 'D', content: 'Madrid', isCorrect: false },
    ],
  },
  {
    id: SEED_QUESTION2_ID,
    content: 'Which planet is known as the Red Planet?',
    difficulty: Difficulty.MEDIUM,
    points: 2,
    options: [
      { id: SEED_Q2_OPT_A_ID, label: 'A', content: 'Venus', isCorrect: false },
      { id: SEED_Q2_OPT_B_ID, label: 'B', content: 'Mars', isCorrect: true },
      { id: SEED_Q2_OPT_C_ID, label: 'C', content: 'Jupiter', isCorrect: false },
      { id: SEED_Q2_OPT_D_ID, label: 'D', content: 'Saturn', isCorrect: false },
    ],
  },
  {
    id: SEED_QUESTION3_ID,
    content: 'What is 2 + 2?',
    difficulty: Difficulty.EASY,
    points: 1,
    options: [
      { id: SEED_Q3_OPT_A_ID, label: 'A', content: '3', isCorrect: false },
      { id: SEED_Q3_OPT_B_ID, label: 'B', content: '4', isCorrect: true },
      { id: SEED_Q3_OPT_C_ID, label: 'C', content: '5', isCorrect: false },
      { id: SEED_Q3_OPT_D_ID, label: 'D', content: '22', isCorrect: false },
    ],
  },
  {
    id: SEED_EXTRA_QUESTION_IDS[0],
    content: 'Which data structure uses FIFO order?',
    difficulty: Difficulty.MEDIUM,
    points: 2,
    options: mcqOptions(0, ['Stack', 'Queue', 'Tree', 'Graph'], 1),
  },
  {
    id: SEED_EXTRA_QUESTION_IDS[1],
    content: 'What does HTTP stand for?',
    difficulty: Difficulty.EASY,
    points: 1,
    options: mcqOptions(1, ['HyperText Transfer Protocol', 'High Transfer Text Process', 'Host Transfer Protocol', 'Hyperlink Text Package'], 0),
  },
  {
    id: SEED_EXTRA_QUESTION_IDS[2],
    content: 'Which SQL clause filters rows?',
    difficulty: Difficulty.MEDIUM,
    points: 2,
    options: mcqOptions(2, ['ORDER BY', 'WHERE', 'GROUP BY', 'JOIN'], 1),
  },
  {
    id: SEED_EXTRA_QUESTION_IDS[3],
    content: 'What is the time complexity of binary search?',
    difficulty: Difficulty.HARD,
    points: 3,
    options: mcqOptions(3, ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], 1),
  },
  {
    id: SEED_EXTRA_QUESTION_IDS[4],
    content: 'Which layer is Vue Router part of in a SPA?',
    difficulty: Difficulty.EASY,
    points: 1,
    options: mcqOptions(4, ['Database', 'Client routing', 'SMTP', 'Operating system'], 1),
  },
  {
    id: SEED_EXTRA_QUESTION_IDS[5],
    content: 'What is a primary key in a relational database?',
    difficulty: Difficulty.MEDIUM,
    points: 2,
    options: mcqOptions(5, ['A duplicate column', 'A unique row identifier', 'A foreign index', 'A backup table'], 1),
  },
  {
    id: SEED_EXTRA_QUESTION_IDS[6],
    content: 'Which HTTP status code means "Not Found"?',
    difficulty: Difficulty.EASY,
    points: 1,
    options: mcqOptions(6, ['200', '401', '404', '500'], 2),
  },
];

export { ExamStatus, AttemptStatus };
