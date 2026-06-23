import { PrismaClient, Difficulty, ExamStatus, AttemptStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  SEED_USERS,
  SEED_PASSWORD,
  SEED_SUBJECT_ID,
  SEED_QUESTION1_ID,
  SEED_QUESTION2_ID,
  SEED_QUESTION3_ID,
  SEED_DRAFT_EXAM_ID,
  SEED_PUBLISHED_EXAM_ID,
  SEED_CLOSED_EXAM_ID,
  SEED_ASSIGNMENT1_ID,
  SEED_ASSIGNMENT2_ID,
  SEED_TEACHER_ID,
  SEED_TEACHER2_ID,
  SEED_STUDENT1_ID,
  SEED_STUDENT2_ID,
  SEED_SUBJECT_EMPTY_ID,
  SEED_SUBJECT2_ID,
  SEED_ASSIGNMENT_CLOSED_ID,
  SEED_Q1_OPT_A_ID,
  SEED_Q1_OPT_B_ID,
  SEED_Q1_OPT_C_ID,
  SEED_Q1_OPT_D_ID,
  SEED_Q2_OPT_A_ID,
  SEED_Q2_OPT_B_ID,
  SEED_Q2_OPT_C_ID,
  SEED_Q2_OPT_D_ID,
  SEED_Q3_OPT_A_ID,
  SEED_Q3_OPT_B_ID,
  SEED_Q3_OPT_C_ID,
  SEED_Q3_OPT_D_ID,
  SEED_ATTEMPT_SUBMITTED_ID,
  SEED_ATTEMPT_EXPIRED_ID,
} from './seed-data.js';

const prisma = new PrismaClient();

/**
 * Seed credentials (dev/test):
 * admin@oex.test    / Password123!   ADMIN
 * teacher@oex.test  / Password123!   TEACHER
 * teacher2@oex.test / Password123!   TEACHER
 * student1@oex.test / Password123!   STUDENT
 * student2@oex.test / Password123!   STUDENT
 * inactive@oex.test / Password123!   STUDENT (inactive)
 */
async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const user of Object.values(SEED_USERS)) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        isActive: 'isActive' in user ? user.isActive : true,
      },
      create: {
        id: user.id,
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        isActive: 'isActive' in user ? user.isActive : true,
      },
    });
  }

  await prisma.subject.upsert({
    where: { teacherId_code: { teacherId: SEED_TEACHER_ID, code: 'CS101' } },
    update: {
      name: 'Introduction to Computer Science',
      description: 'Fundamentals of computing',
    },
    create: {
      id: SEED_SUBJECT_ID,
      code: 'CS101',
      name: 'Introduction to Computer Science',
      description: 'Fundamentals of computing',
      teacherId: SEED_TEACHER_ID,
    },
  });

  await prisma.subject.upsert({
    where: { teacherId_code: { teacherId: SEED_TEACHER_ID, code: 'EMPTY' } },
    update: { name: 'Empty Subject', description: 'No questions or exams' },
    create: {
      id: SEED_SUBJECT_EMPTY_ID,
      code: 'EMPTY',
      name: 'Empty Subject',
      description: 'No questions or exams',
      teacherId: SEED_TEACHER_ID,
    },
  });

  await prisma.subject.upsert({
    where: { teacherId_code: { teacherId: SEED_TEACHER2_ID, code: 'MATH101' } },
    update: { name: 'Mathematics 101', description: 'Teacher two subject' },
    create: {
      id: SEED_SUBJECT2_ID,
      code: 'MATH101',
      name: 'Mathematics 101',
      description: 'Teacher two subject',
      teacherId: SEED_TEACHER2_ID,
    },
  });

  const questions = [
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
  ];

  for (const q of questions) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {
        content: q.content,
        difficulty: q.difficulty,
        points: q.points,
      },
      create: {
        id: q.id,
        subjectId: SEED_SUBJECT_ID,
        content: q.content,
        difficulty: q.difficulty,
        points: q.points,
        createdBy: SEED_TEACHER_ID,
      },
    });

    await prisma.questionOption.deleteMany({ where: { questionId: q.id } });
    for (const opt of q.options) {
      await prisma.questionOption.create({
        data: {
          id: opt.id,
          questionId: q.id,
          label: opt.label,
          content: opt.content,
          isCorrect: opt.isCorrect,
        },
      });
    }
  }

  const now = new Date();
  const pastOpen = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pastClose = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const futureClose = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const exams = [
    {
      id: SEED_DRAFT_EXAM_ID,
      title: 'CS101 Draft Exam',
      status: ExamStatus.DRAFT,
      openAt: pastOpen,
      closeAt: futureClose,
      linkQuestions: false,
    },
    {
      id: SEED_PUBLISHED_EXAM_ID,
      title: 'CS101 Midterm',
      status: ExamStatus.PUBLISHED,
      openAt: pastOpen,
      closeAt: futureClose,
      linkQuestions: true,
    },
    {
      id: SEED_CLOSED_EXAM_ID,
      title: 'CS101 Final (Closed)',
      status: ExamStatus.CLOSED,
      openAt: pastOpen,
      closeAt: pastClose,
      linkQuestions: false,
    },
  ];

  for (const exam of exams) {
    await prisma.exam.upsert({
      where: { id: exam.id },
      update: {
        title: exam.title,
        status: exam.status,
        openAt: exam.openAt,
        closeAt: exam.closeAt,
      },
      create: {
        id: exam.id,
        subjectId: SEED_SUBJECT_ID,
        title: exam.title,
        description: `Seed exam: ${exam.title}`,
        durationMinutes: 60,
        openAt: exam.openAt,
        closeAt: exam.closeAt,
        maxAttempts: 2,
        showAnswersAfterSubmit: true,
        status: exam.status,
        createdBy: SEED_TEACHER_ID,
      },
    });
  }

  await prisma.examQuestion.deleteMany({ where: { examId: SEED_PUBLISHED_EXAM_ID } });
  const publishedQuestions = [SEED_QUESTION1_ID, SEED_QUESTION2_ID, SEED_QUESTION3_ID];
  for (let i = 0; i < publishedQuestions.length; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: SEED_PUBLISHED_EXAM_ID,
        questionId: publishedQuestions[i],
        orderIndex: i + 1,
      },
    });
  }

  await prisma.examAssignment.upsert({
    where: { examId_studentId: { examId: SEED_PUBLISHED_EXAM_ID, studentId: SEED_STUDENT1_ID } },
    update: { assignedBy: SEED_TEACHER_ID },
    create: {
      id: SEED_ASSIGNMENT1_ID,
      examId: SEED_PUBLISHED_EXAM_ID,
      studentId: SEED_STUDENT1_ID,
      assignedBy: SEED_TEACHER_ID,
    },
  });

  await prisma.examAssignment.upsert({
    where: { examId_studentId: { examId: SEED_PUBLISHED_EXAM_ID, studentId: SEED_STUDENT2_ID } },
    update: { assignedBy: SEED_TEACHER_ID },
    create: {
      id: SEED_ASSIGNMENT2_ID,
      examId: SEED_PUBLISHED_EXAM_ID,
      studentId: SEED_STUDENT2_ID,
      assignedBy: SEED_TEACHER_ID,
    },
  });

  await prisma.examAssignment.upsert({
    where: {
      examId_studentId: { examId: SEED_CLOSED_EXAM_ID, studentId: SEED_STUDENT1_ID },
    },
    update: { assignedBy: SEED_TEACHER_ID },
    create: {
      id: SEED_ASSIGNMENT_CLOSED_ID,
      examId: SEED_CLOSED_EXAM_ID,
      studentId: SEED_STUDENT1_ID,
      assignedBy: SEED_TEACHER_ID,
    },
  });

  const submittedStarted = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const submittedAt = new Date(submittedStarted.getTime() + 30 * 60 * 1000);

  await prisma.examAttempt.deleteMany({
    where: {
      assignmentId: { in: [SEED_ASSIGNMENT1_ID, SEED_ASSIGNMENT2_ID] },
      id: { notIn: [SEED_ATTEMPT_SUBMITTED_ID, SEED_ATTEMPT_EXPIRED_ID] },
    },
  });

  await prisma.examAttempt.upsert({
    where: { id: SEED_ATTEMPT_SUBMITTED_ID },
    update: {
      status: AttemptStatus.SUBMITTED,
      score: 2,
      maxScore: 4,
      submittedAt,
    },
    create: {
      id: SEED_ATTEMPT_SUBMITTED_ID,
      assignmentId: SEED_ASSIGNMENT2_ID,
      startedAt: submittedStarted,
      expiresAt: new Date(submittedStarted.getTime() + 60 * 60 * 1000),
      submittedAt,
      score: 2,
      maxScore: 4,
      status: AttemptStatus.SUBMITTED,
    },
  });

  await prisma.attemptAnswer.deleteMany({ where: { attemptId: SEED_ATTEMPT_SUBMITTED_ID } });
  const submittedAnswers = [
    { questionId: SEED_QUESTION1_ID, selectedOptionId: SEED_Q1_OPT_B_ID, isCorrect: true },
    { questionId: SEED_QUESTION2_ID, selectedOptionId: SEED_Q2_OPT_A_ID, isCorrect: false },
    { questionId: SEED_QUESTION3_ID, selectedOptionId: SEED_Q3_OPT_B_ID, isCorrect: true },
  ];
  for (const ans of submittedAnswers) {
    await prisma.attemptAnswer.create({
      data: { attemptId: SEED_ATTEMPT_SUBMITTED_ID, ...ans },
    });
  }

  const expiredStarted = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const expiredAt = new Date(expiredStarted.getTime() + 60 * 60 * 1000);

  await prisma.examAttempt.upsert({
    where: { id: SEED_ATTEMPT_EXPIRED_ID },
    update: {
      status: AttemptStatus.EXPIRED,
      score: 1,
      maxScore: 4,
      expiresAt: expiredAt,
    },
    create: {
      id: SEED_ATTEMPT_EXPIRED_ID,
      assignmentId: SEED_ASSIGNMENT1_ID,
      startedAt: expiredStarted,
      expiresAt: expiredAt,
      submittedAt: expiredAt,
      score: 1,
      maxScore: 4,
      status: AttemptStatus.EXPIRED,
    },
  });

  await prisma.attemptAnswer.deleteMany({ where: { attemptId: SEED_ATTEMPT_EXPIRED_ID } });
  await prisma.attemptAnswer.create({
    data: {
      attemptId: SEED_ATTEMPT_EXPIRED_ID,
      questionId: SEED_QUESTION1_ID,
      selectedOptionId: SEED_Q1_OPT_B_ID,
      isCorrect: true,
    },
  });
  for (const qId of [SEED_QUESTION2_ID, SEED_QUESTION3_ID]) {
    await prisma.attemptAnswer.create({
      data: { attemptId: SEED_ATTEMPT_EXPIRED_ID, questionId: qId, selectedOptionId: null, isCorrect: false },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
