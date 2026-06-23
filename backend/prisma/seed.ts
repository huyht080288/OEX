import { PrismaClient, ExamStatus, AttemptStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  SEED_USERS,
  SEED_PASSWORD,
  SEED_TEACHER_ID,
  SEED_STUDENT1_ID,
  SEED_STUDENT2_ID,
  SEED_SUBJECT_ID,
  SEED_DRAFT_EXAM_ID,
  SEED_PUBLISHED_EXAM_ID,
  SEED_CLOSED_EXAM_ID,
  SEED_ASSIGNMENT1_ID,
  SEED_ASSIGNMENT2_ID,
  SEED_ASSIGNMENT_CLOSED_ID,
  SEED_QUESTION1_ID,
  SEED_QUESTION2_ID,
  SEED_QUESTION3_ID,
  SEED_Q1_OPT_B_ID,
  SEED_Q2_OPT_A_ID,
  SEED_Q3_OPT_B_ID,
  SEED_ATTEMPT_SUBMITTED_ID,
  SEED_ATTEMPT_EXPIRED_ID,
  SEED_EXTRA_STUDENT_IDS,
  SEED_EXTRA_TEACHER_IDS,
  SEED_EXTRA_EXAM_IDS,
  SEED_EXTRA_ASSIGNMENT_IDS,
  SEED_EXTRA_ATTEMPT_IDS,
  SEED_ALL_QUESTION_IDS,
  BULK_SUBJECTS,
  BULK_QUESTIONS,
} from './seed-data.js';

const prisma = new PrismaClient();

/**
 * Seed credentials (dev/test) — password for all: Password123!
 *
 * Core: admin@oex.test, teacher@oex.test, teacher2@oex.test,
 *       student1@oex.test … student10@oex.test, teacher3 … teacher10, inactive@oex.test
 *
 * Each entity type has at least 10 records.
 */
async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const now = new Date();
  const pastOpen = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pastClose = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const futureClose = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

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

  for (let i = 0; i < SEED_EXTRA_TEACHER_IDS.length; i++) {
    const n = i + 3;
    const id = SEED_EXTRA_TEACHER_IDS[i];
    const email = `teacher${n}@oex.test`;
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, fullName: `Teacher ${n}`, role: 'TEACHER', isActive: true },
      create: { id, email, passwordHash, fullName: `Teacher ${n}`, role: 'TEACHER', isActive: true },
    });
  }

  for (let i = 0; i < SEED_EXTRA_STUDENT_IDS.length; i++) {
    const n = i + 3;
    const id = SEED_EXTRA_STUDENT_IDS[i];
    const email = `student${n}@oex.test`;
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, fullName: `Student ${n}`, role: 'STUDENT', isActive: true },
      create: {
        id,
        email,
        passwordHash,
        fullName: `Student ${n}`,
        role: 'STUDENT',
        isActive: true,
      },
    });
  }

  for (const subject of BULK_SUBJECTS) {
    await prisma.subject.upsert({
      where: { teacherId_code: { teacherId: subject.teacherId, code: subject.code } },
      update: { name: subject.name, description: `Seed subject: ${subject.name}` },
      create: {
        id: subject.id,
        code: subject.code,
        name: subject.name,
        description: `Seed subject: ${subject.name}`,
        teacherId: subject.teacherId,
      },
    });
  }

  for (const q of BULK_QUESTIONS) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: { content: q.content, difficulty: q.difficulty, points: q.points },
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

  const exams = [
    {
      id: SEED_DRAFT_EXAM_ID,
      title: 'CS101 Draft Exam',
      status: ExamStatus.DRAFT,
      openAt: pastOpen,
      closeAt: futureClose,
    },
    {
      id: SEED_PUBLISHED_EXAM_ID,
      title: 'CS101 Midterm',
      status: ExamStatus.PUBLISHED,
      openAt: pastOpen,
      closeAt: futureClose,
    },
    {
      id: SEED_CLOSED_EXAM_ID,
      title: 'CS101 Final (Closed)',
      status: ExamStatus.CLOSED,
      openAt: pastOpen,
      closeAt: pastClose,
    },
    {
      id: SEED_EXTRA_EXAM_IDS[0],
      title: 'CS101 Quiz A',
      status: ExamStatus.PUBLISHED,
      openAt: pastOpen,
      closeAt: futureClose,
    },
    {
      id: SEED_EXTRA_EXAM_IDS[1],
      title: 'CS101 Quiz B',
      status: ExamStatus.PUBLISHED,
      openAt: pastOpen,
      closeAt: futureClose,
    },
    {
      id: SEED_EXTRA_EXAM_IDS[2],
      title: 'CS101 Practice Test',
      status: ExamStatus.DRAFT,
      openAt: pastOpen,
      closeAt: futureClose,
    },
    {
      id: SEED_EXTRA_EXAM_IDS[3],
      title: 'CS101 Mock Exam',
      status: ExamStatus.PUBLISHED,
      openAt: pastOpen,
      closeAt: futureClose,
    },
    {
      id: SEED_EXTRA_EXAM_IDS[4],
      title: 'CS101 Review Session',
      status: ExamStatus.CLOSED,
      openAt: pastOpen,
      closeAt: pastClose,
    },
    {
      id: SEED_EXTRA_EXAM_IDS[5],
      title: 'CS101 Lab Assessment',
      status: ExamStatus.DRAFT,
      openAt: pastOpen,
      closeAt: futureClose,
    },
    {
      id: SEED_EXTRA_EXAM_IDS[6],
      title: 'CS101 Supplemental Quiz',
      status: ExamStatus.PUBLISHED,
      openAt: pastOpen,
      closeAt: futureClose,
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

  const examQuestionLinks = [
    { examId: SEED_PUBLISHED_EXAM_ID, questionIds: SEED_ALL_QUESTION_IDS.slice(0, 3) },
    { examId: SEED_EXTRA_EXAM_IDS[0], questionIds: SEED_ALL_QUESTION_IDS.slice(3, 6) },
    { examId: SEED_EXTRA_EXAM_IDS[1], questionIds: SEED_ALL_QUESTION_IDS.slice(6, 9) },
    { examId: SEED_EXTRA_EXAM_IDS[3], questionIds: SEED_ALL_QUESTION_IDS.slice(0, 5) },
    { examId: SEED_EXTRA_EXAM_IDS[6], questionIds: SEED_ALL_QUESTION_IDS.slice(5, 10) },
  ];

  for (const link of examQuestionLinks) {
    await prisma.examQuestion.deleteMany({ where: { examId: link.examId } });
    for (let i = 0; i < link.questionIds.length; i++) {
      await prisma.examQuestion.create({
        data: {
          examId: link.examId,
          questionId: link.questionIds[i],
          orderIndex: i + 1,
        },
      });
    }
  }

  const studentIds = [SEED_STUDENT1_ID, SEED_STUDENT2_ID, ...SEED_EXTRA_STUDENT_IDS];

  const assignmentDefs = [
    { id: SEED_ASSIGNMENT1_ID, examId: SEED_PUBLISHED_EXAM_ID, studentId: SEED_STUDENT1_ID },
    { id: SEED_ASSIGNMENT2_ID, examId: SEED_PUBLISHED_EXAM_ID, studentId: SEED_STUDENT2_ID },
    {
      id: SEED_ASSIGNMENT_CLOSED_ID,
      examId: SEED_CLOSED_EXAM_ID,
      studentId: SEED_STUDENT1_ID,
    },
    { id: SEED_EXTRA_ASSIGNMENT_IDS[0], examId: SEED_EXTRA_EXAM_IDS[0], studentId: studentIds[2] },
    { id: SEED_EXTRA_ASSIGNMENT_IDS[1], examId: SEED_EXTRA_EXAM_IDS[0], studentId: studentIds[3] },
    { id: SEED_EXTRA_ASSIGNMENT_IDS[2], examId: SEED_EXTRA_EXAM_IDS[0], studentId: studentIds[4] },
    { id: SEED_EXTRA_ASSIGNMENT_IDS[3], examId: SEED_EXTRA_EXAM_IDS[1], studentId: studentIds[5] },
    { id: SEED_EXTRA_ASSIGNMENT_IDS[4], examId: SEED_EXTRA_EXAM_IDS[1], studentId: studentIds[6] },
    { id: SEED_EXTRA_ASSIGNMENT_IDS[5], examId: SEED_EXTRA_EXAM_IDS[3], studentId: studentIds[7] },
    { id: SEED_EXTRA_ASSIGNMENT_IDS[6], examId: SEED_EXTRA_EXAM_IDS[6], studentId: studentIds[8] },
  ];

  for (const a of assignmentDefs) {
    await prisma.examAssignment.upsert({
      where: { examId_studentId: { examId: a.examId, studentId: a.studentId } },
      update: { assignedBy: SEED_TEACHER_ID },
      create: {
        id: a.id,
        examId: a.examId,
        studentId: a.studentId,
        assignedBy: SEED_TEACHER_ID,
      },
    });
  }

  const submittedStarted = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const submittedAt = new Date(submittedStarted.getTime() + 30 * 60 * 1000);
  const expiredStarted = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const expiredAt = new Date(expiredStarted.getTime() + 60 * 60 * 1000);

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
  for (const ans of [
    { questionId: SEED_QUESTION1_ID, selectedOptionId: SEED_Q1_OPT_B_ID, isCorrect: true },
    { questionId: SEED_QUESTION2_ID, selectedOptionId: SEED_Q2_OPT_A_ID, isCorrect: false },
    { questionId: SEED_QUESTION3_ID, selectedOptionId: SEED_Q3_OPT_B_ID, isCorrect: true },
  ]) {
    await prisma.attemptAnswer.create({
      data: { attemptId: SEED_ATTEMPT_SUBMITTED_ID, ...ans },
    });
  }

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
      data: {
        attemptId: SEED_ATTEMPT_EXPIRED_ID,
        questionId: qId,
        selectedOptionId: null,
        isCorrect: false,
      },
    });
  }

  const extraAttemptDefs = [
    {
      id: SEED_EXTRA_ATTEMPT_IDS[0],
      assignmentId: SEED_EXTRA_ASSIGNMENT_IDS[0],
      status: AttemptStatus.SUBMITTED,
      score: 4,
      maxScore: 6,
      daysAgo: 5,
    },
    {
      id: SEED_EXTRA_ATTEMPT_IDS[1],
      assignmentId: SEED_EXTRA_ASSIGNMENT_IDS[1],
      status: AttemptStatus.SUBMITTED,
      score: 3,
      maxScore: 6,
      daysAgo: 4,
    },
    {
      id: SEED_EXTRA_ATTEMPT_IDS[2],
      assignmentId: SEED_EXTRA_ASSIGNMENT_IDS[2],
      status: AttemptStatus.EXPIRED,
      score: 2,
      maxScore: 6,
      daysAgo: 6,
    },
    {
      id: SEED_EXTRA_ATTEMPT_IDS[3],
      assignmentId: SEED_EXTRA_ASSIGNMENT_IDS[3],
      status: AttemptStatus.SUBMITTED,
      score: 5,
      maxScore: 6,
      daysAgo: 3,
    },
    {
      id: SEED_EXTRA_ATTEMPT_IDS[4],
      assignmentId: SEED_EXTRA_ASSIGNMENT_IDS[4],
      status: AttemptStatus.SUBMITTED,
      score: 6,
      maxScore: 6,
      daysAgo: 2,
    },
    {
      id: SEED_EXTRA_ATTEMPT_IDS[5],
      assignmentId: SEED_EXTRA_ASSIGNMENT_IDS[5],
      status: AttemptStatus.IN_PROGRESS,
      score: null as number | null,
      maxScore: 10,
      daysAgo: 0,
    },
    {
      id: SEED_EXTRA_ATTEMPT_IDS[6],
      assignmentId: SEED_EXTRA_ASSIGNMENT_IDS[6],
      status: AttemptStatus.SUBMITTED,
      score: 7,
      maxScore: 10,
      daysAgo: 1,
    },
    {
      id: SEED_EXTRA_ATTEMPT_IDS[7],
      assignmentId: SEED_EXTRA_ASSIGNMENT_IDS[0],
      status: AttemptStatus.SUBMITTED,
      score: 5,
      maxScore: 6,
      daysAgo: 1,
    },
  ];

  for (const att of extraAttemptDefs) {
    const startedAt = new Date(now.getTime() - att.daysAgo * 24 * 60 * 60 * 1000);
    const expires = new Date(startedAt.getTime() + 60 * 60 * 1000);
    const isDone =
      att.status === AttemptStatus.SUBMITTED || att.status === AttemptStatus.EXPIRED;

    await prisma.examAttempt.upsert({
      where: { id: att.id },
      update: {
        status: att.status,
        score: att.score,
        maxScore: att.maxScore,
        submittedAt: isDone ? expires : null,
      },
      create: {
        id: att.id,
        assignmentId: att.assignmentId,
        startedAt,
        expiresAt: expires,
        submittedAt: isDone ? expires : null,
        score: att.score,
        maxScore: att.maxScore,
        status: att.status,
      },
    });

    if (att.status === AttemptStatus.IN_PROGRESS) {
      await prisma.attemptAnswer.deleteMany({ where: { attemptId: att.id } });
      continue;
    }

    const assignment = assignmentDefs.find((a) => a.id === att.assignmentId);
    const examLink = examQuestionLinks.find((l) => l.examId === assignment?.examId);
    const questionIds = examLink?.questionIds ?? SEED_ALL_QUESTION_IDS.slice(0, 3);

    await prisma.attemptAnswer.deleteMany({ where: { attemptId: att.id } });
    for (let qi = 0; qi < questionIds.length; qi++) {
      const qDef = BULK_QUESTIONS.find((q) => q.id === questionIds[qi]);
      const correctOpt = qDef?.options.find((o) => o.isCorrect);
      const wrongOpt = qDef?.options.find((o) => !o.isCorrect);
      const pickCorrect = qi % 2 === 0;
      await prisma.attemptAnswer.create({
        data: {
          attemptId: att.id,
          questionId: questionIds[qi],
          selectedOptionId: pickCorrect ? correctOpt?.id : wrongOpt?.id,
          isCorrect: pickCorrect,
        },
      });
    }
  }

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.subject.count(),
    prisma.question.count(),
    prisma.questionOption.count(),
    prisma.exam.count(),
    prisma.examQuestion.count(),
    prisma.examAssignment.count(),
    prisma.examAttempt.count(),
    prisma.attemptAnswer.count(),
  ]);

  const labels = [
    'users',
    'teachers',
    'students',
    'subjects',
    'questions',
    'question_options',
    'exams',
    'exam_questions',
    'exam_assignments',
    'exam_attempts',
    'attempt_answers',
  ];

  console.log('Seed record counts:');
  labels.forEach((label, i) => console.log(`  ${label}: ${counts[i]}`));

  const belowMin = labels
    .map((label, i) => ({ label, count: counts[i] }))
    .filter(({ label, count }) => label !== 'users' && count < 10);
  if (belowMin.length > 0) {
    throw new Error(
      `Seed below minimum (10): ${belowMin.map((x) => `${x.label}=${x.count}`).join(', ')}`,
    );
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
