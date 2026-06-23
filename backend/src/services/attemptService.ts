import { AttemptStatus, ExamStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { SaveAnswersInput, StartAttemptInput } from '../validators/attempts.js';

type AttemptWithDetails = Prisma.ExamAttemptGetPayload<{
  include: {
    answers: true;
    assignment: {
      include: {
        exam: {
          include: {
            questions: {
              include: {
                question: { include: { options: true } };
              };
            };
          };
        };
      };
    };
  };
}>;

const attemptInclude = {
  answers: true,
  assignment: {
    include: {
      exam: {
        include: {
          questions: {
            include: {
              question: { include: { options: true } },
            },
            orderBy: { orderIndex: 'asc' as const },
          },
        },
      },
    },
  },
} satisfies Prisma.ExamAttemptInclude;

function countUsedAttempts(
  attempts: { status: AttemptStatus }[],
): number {
  return attempts.filter(
    (a) =>
      a.status === AttemptStatus.SUBMITTED || a.status === AttemptStatus.EXPIRED,
  ).length;
}

function toStudentQuestions(
  examQuestions: AttemptWithDetails['assignment']['exam']['questions'],
) {
  return examQuestions.map((eq) => ({
    id: eq.question.id,
    orderIndex: eq.orderIndex,
    content: eq.question.content,
    points: Number(eq.question.points),
    options: eq.question.options.map(({ id, label, content }) => ({
      id,
      label,
      content,
    })),
  }));
}

function toAnswersMap(answers: { questionId: string; selectedOptionId: string | null }[]) {
  const map: Record<string, string | null> = {};
  for (const a of answers) {
    map[a.questionId] = a.selectedOptionId;
  }
  return map;
}

async function loadAttempt(attemptId: string): Promise<AttemptWithDetails> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: attemptInclude,
  });
  if (!attempt) {
    throw new AppError(404, 'NOT_FOUND', 'Attempt not found');
  }
  return attempt;
}

async function assertStudentOwnsAttempt(studentId: string, attempt: AttemptWithDetails) {
  if (attempt.assignment.studentId !== studentId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not own this attempt');
  }
}

async function gradeAttemptInTx(
  tx: Prisma.TransactionClient,
  attempt: AttemptWithDetails,
) {
  const examQuestions = attempt.assignment.exam.questions;
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;

  for (const eq of examQuestions) {
    const question = eq.question;
    maxScore += Number(question.points);
    const answer = attempt.answers.find((a) => a.questionId === question.id);
    const correctOption = question.options.find((o) => o.isCorrect);
    const isCorrect =
      !!answer?.selectedOptionId && answer.selectedOptionId === correctOption?.id;

    if (isCorrect) {
      score += Number(question.points);
      correctCount += 1;
    }

    if (answer) {
      await tx.attemptAnswer.update({
        where: { id: answer.id },
        data: { isCorrect },
      });
    }
  }

  return { score, maxScore, correctCount, totalQuestions: examQuestions.length };
}

async function expireAttemptIfNeeded(attempt: AttemptWithDetails): Promise<AttemptWithDetails> {
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    return attempt;
  }
  if (new Date() <= attempt.expiresAt) {
    return attempt;
  }

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.examAttempt.findUnique({
      where: { id: attempt.id },
      include: attemptInclude,
    });
    if (!fresh || fresh.status !== AttemptStatus.IN_PROGRESS) {
      return;
    }

    const graded = await gradeAttemptInTx(tx, fresh);
    await tx.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.EXPIRED,
        submittedAt: fresh.expiresAt,
        score: graded.score,
        maxScore: graded.maxScore,
      },
    });
  });

  return loadAttempt(attempt.id);
}

function buildReview(
  attempt: AttemptWithDetails,
  showAnswers: boolean,
) {
  if (!showAnswers) {
    return [];
  }

  return attempt.assignment.exam.questions.map((eq) => {
    const question = eq.question;
    const answer = attempt.answers.find((a) => a.questionId === question.id);
    const correctOption = question.options.find((o) => o.isCorrect);
    const selectedOption = answer?.selectedOptionId
      ? question.options.find((o) => o.id === answer.selectedOptionId)
      : null;
    return {
      questionId: question.id,
      content: question.content,
      selectedOptionId: answer?.selectedOptionId ?? null,
      selectedOption: selectedOption
        ? { id: selectedOption.id, label: selectedOption.label, content: selectedOption.content }
        : null,
      correctOptionId: correctOption?.id ?? null,
      correctOption: correctOption
        ? { id: correctOption.id, label: correctOption.label, content: correctOption.content }
        : null,
      isCorrect: answer?.isCorrect ?? false,
      points: Number(question.points),
    };
  });
}

export async function listMyExams(studentId: string) {
  const assignments = await prisma.examAssignment.findMany({
    where: { studentId },
    include: {
      exam: { include: { subject: true } },
      attempts: { orderBy: { startedAt: 'desc' } },
    },
    orderBy: { assignedAt: 'desc' },
  });

  return assignments.map((a) => {
    const usedAttempts = countUsedAttempts(a.attempts);
    const inProgress = a.attempts.find((at) => at.status === AttemptStatus.IN_PROGRESS);
    const submitted = a.attempts.filter((at) => at.status === AttemptStatus.SUBMITTED);
    const lastCompleted = a.attempts.find(
      (at) =>
        at.status === AttemptStatus.SUBMITTED || at.status === AttemptStatus.EXPIRED,
    );
    const bestScore = submitted.reduce((best, at) => {
      const score = at.score !== null ? Number(at.score) : 0;
      return score > best ? score : best;
    }, 0);

    return {
      assignmentId: a.id,
      exam: {
        id: a.exam.id,
        title: a.exam.title,
        subjectName: a.exam.subject.name,
        status: a.exam.status,
        durationMinutes: a.exam.durationMinutes,
        openAt: a.exam.openAt.toISOString(),
        closeAt: a.exam.closeAt.toISOString(),
      },
      attemptCount: usedAttempts,
      maxAttempts: a.exam.maxAttempts,
      hasInProgress: !!inProgress,
      inProgressAttemptId: inProgress?.id ?? null,
      lastCompletedAttemptId: lastCompleted?.id ?? null,
      bestScore: submitted.length > 0 ? bestScore : null,
      lastAttemptStatus: a.attempts[0]?.status ?? null,
    };
  });
}

export async function startAttempt(studentId: string, input: StartAttemptInput) {
  const assignment = await prisma.examAssignment.findUnique({
    where: { id: input.assignmentId },
    include: {
      exam: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
      attempts: true,
    },
  });

  if (!assignment) {
    throw new AppError(404, 'NOT_FOUND', 'Assignment not found');
  }
  if (assignment.studentId !== studentId) {
    throw new AppError(403, 'FORBIDDEN', 'This exam is not assigned to you');
  }

  const exam = assignment.exam;
  const now = new Date();

  if (exam.status !== ExamStatus.PUBLISHED) {
    throw new AppError(400, 'EXAM_NOT_AVAILABLE', 'Exam is not available');
  }
  if (now < exam.openAt || now > exam.closeAt) {
    throw new AppError(400, 'EXAM_NOT_AVAILABLE', 'Exam is outside the availability window');
  }

  const inProgress = assignment.attempts.find((a) => a.status === AttemptStatus.IN_PROGRESS);
  if (inProgress) {
    throw new AppError(409, 'ATTEMPT_IN_PROGRESS', 'You already have an active attempt');
  }

  const usedAttempts = countUsedAttempts(assignment.attempts);
  if (usedAttempts >= exam.maxAttempts) {
    throw new AppError(400, 'MAX_ATTEMPTS_REACHED', 'No attempts remaining');
  }

  if (exam.questions.length === 0) {
    throw new AppError(400, 'EXAM_NOT_AVAILABLE', 'Exam has no questions');
  }

  const maxScore = await prisma.question.aggregate({
    where: { id: { in: exam.questions.map((q) => q.questionId) } },
    _sum: { points: true },
  });

  const startedAt = now;
  const expiresAt = new Date(startedAt.getTime() + exam.durationMinutes * 60 * 1000);

  const attempt = await prisma.$transaction(async (tx) => {
    const created = await tx.examAttempt.create({
      data: {
        assignmentId: assignment.id,
        startedAt,
        expiresAt,
        maxScore: maxScore._sum.points ?? 0,
        status: AttemptStatus.IN_PROGRESS,
        answers: {
          create: exam.questions.map((eq) => ({
            questionId: eq.questionId,
            selectedOptionId: null,
          })),
        },
      },
      include: attemptInclude,
    });
    return created;
  });

  return {
    attemptId: attempt.id,
    examTitle: attempt.assignment.exam.title,
    expiresAt: attempt.expiresAt.toISOString(),
    questions: toStudentQuestions(attempt.assignment.exam.questions),
    answers: toAnswersMap(attempt.answers),
  };
}

export async function getAttempt(studentId: string, attemptId: string) {
  let attempt = await loadAttempt(attemptId);
  await assertStudentOwnsAttempt(studentId, attempt);

  attempt = await expireAttemptIfNeeded(attempt);

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Attempt is not in progress');
  }

  return {
    attemptId: attempt.id,
    examTitle: attempt.assignment.exam.title,
    expiresAt: attempt.expiresAt.toISOString(),
    questions: toStudentQuestions(attempt.assignment.exam.questions),
    answers: toAnswersMap(attempt.answers),
  };
}

export async function saveAnswers(
  studentId: string,
  attemptId: string,
  input: SaveAnswersInput,
) {
  let attempt = await loadAttempt(attemptId);
  await assertStudentOwnsAttempt(studentId, attempt);

  attempt = await expireAttemptIfNeeded(attempt);

  if (attempt.status === AttemptStatus.EXPIRED) {
    throw new AppError(400, 'ATTEMPT_EXPIRED', 'Attempt has expired');
  }
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Attempt is not in progress');
  }

  const questionIds = new Set(
    attempt.assignment.exam.questions.map((eq) => eq.questionId),
  );
  const optionByQuestion = new Map(
    attempt.assignment.exam.questions.map((eq) => [
      eq.questionId,
      new Set(eq.question.options.map((o) => o.id)),
    ]),
  );

  for (const answer of input.answers) {
    if (!questionIds.has(answer.questionId)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid question for this attempt');
    }
    if (
      answer.selectedOptionId &&
      !optionByQuestion.get(answer.questionId)?.has(answer.selectedOptionId)
    ) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid option for this question');
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const answer of input.answers) {
      await tx.attemptAnswer.update({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: answer.questionId,
          },
        },
        data: { selectedOptionId: answer.selectedOptionId },
      });
    }
  });

  return getAttempt(studentId, attemptId);
}

export async function submitAttempt(studentId: string, attemptId: string) {
  let attempt = await loadAttempt(attemptId);
  await assertStudentOwnsAttempt(studentId, attempt);

  if (attempt.status === AttemptStatus.SUBMITTED) {
    throw new AppError(409, 'VALIDATION_ERROR', 'Attempt has already been submitted');
  }

  attempt = await expireAttemptIfNeeded(attempt);

  if (attempt.status === AttemptStatus.EXPIRED) {
    throw new AppError(400, 'ATTEMPT_EXPIRED', 'Attempt has expired');
  }
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Attempt is not in progress');
  }

  const now = new Date();
  if (now > attempt.expiresAt) {
    await expireAttemptIfNeeded(attempt);
    throw new AppError(400, 'ATTEMPT_EXPIRED', 'Attempt has expired');
  }

  const showReview = attempt.assignment.exam.showAnswersAfterSubmit;
  const submittedAt = now;

  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.examAttempt.findUnique({
      where: { id: attemptId },
      include: attemptInclude,
    });
    if (!fresh || fresh.status !== AttemptStatus.IN_PROGRESS) {
      throw new AppError(409, 'VALIDATION_ERROR', 'Attempt has already been submitted');
    }

    const graded = await gradeAttemptInTx(tx, fresh);
    const updated = await tx.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.SUBMITTED,
        submittedAt,
        score: graded.score,
        maxScore: graded.maxScore,
      },
      include: attemptInclude,
    });

    return {
      score: graded.score,
      maxScore: graded.maxScore,
      correctCount: graded.correctCount,
      totalQuestions: graded.totalQuestions,
      submittedAt: submittedAt.toISOString(),
      review: buildReview(updated, showReview),
    };
  });

  return result;
}

export async function getAttemptResult(studentId: string, attemptId: string) {
  const attempt = await loadAttempt(attemptId);
  await assertStudentOwnsAttempt(studentId, attempt);

  if (
    attempt.status !== AttemptStatus.SUBMITTED &&
    attempt.status !== AttemptStatus.EXPIRED
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Result is not available yet');
  }

  const showReview = attempt.assignment.exam.showAnswersAfterSubmit;
  const correctCount = attempt.answers.filter((a) => a.isCorrect).length;

  return {
    attemptId: attempt.id,
    examTitle: attempt.assignment.exam.title,
    status: attempt.status,
    score: attempt.score !== null ? Number(attempt.score) : 0,
    maxScore: Number(attempt.maxScore),
    correctCount,
    totalQuestions: attempt.assignment.exam.questions.length,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    review: buildReview(attempt, showReview),
  };
}

export async function getAttemptResultForTeacher(
  teacherId: string,
  examId: string,
  attemptId: string,
) {
  const attempt = await loadAttempt(attemptId);
  const exam = attempt.assignment.exam;

  if (exam.id !== examId) {
    throw new AppError(404, 'NOT_FOUND', 'Attempt not found');
  }

  if (exam.createdBy !== teacherId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this attempt');
  }

  if (
    attempt.status !== AttemptStatus.SUBMITTED &&
    attempt.status !== AttemptStatus.EXPIRED
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Result is not available yet');
  }

  const student = await prisma.user.findUnique({
    where: { id: attempt.assignment.studentId },
  });
  if (!student) {
    throw new AppError(404, 'NOT_FOUND', 'Student not found');
  }

  const correctCount = attempt.answers.filter((a) => a.isCorrect).length;

  return {
    attemptId: attempt.id,
    examTitle: exam.title,
    studentId: student.id,
    studentName: student.fullName,
    studentEmail: student.email,
    status: attempt.status,
    score: attempt.score !== null ? Number(attempt.score) : 0,
    maxScore: Number(attempt.maxScore),
    correctCount,
    totalQuestions: exam.questions.length,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    review: buildReview(attempt, true),
  };
}
