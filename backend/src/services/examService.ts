import { ExamStatus, Prisma, Role, AttemptStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { getOwnedSubject } from './subjectService.js';
import * as attemptService from './attemptService.js';
import {
  CreateExamInput,
  UpdateExamInput,
  SetExamQuestionsInput,
  UpdateExamStatusInput,
  AssignStudentsInput,
} from '../validators/exams.js';

type ExamWithRelations = Prisma.ExamGetPayload<{
  include: {
    questions: { include: { question: { include: { options: true } } } };
    assignments: { include: { student: true } };
  };
}>;

function toExamDto(
  exam: ExamWithRelations | Prisma.ExamGetPayload<object>,
  options?: { includeQuestions?: boolean; includeAssignments?: boolean },
) {
  const base = {
    id: exam.id,
    subjectId: exam.subjectId,
    title: exam.title,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    openAt: exam.openAt.toISOString(),
    closeAt: exam.closeAt.toISOString(),
    maxAttempts: exam.maxAttempts,
    showAnswersAfterSubmit: exam.showAnswersAfterSubmit,
    status: exam.status,
    createdBy: exam.createdBy,
    createdAt: exam.createdAt.toISOString(),
    updatedAt: exam.updatedAt.toISOString(),
  };

  if (!options?.includeQuestions && !options?.includeAssignments) {
    return base;
  }

  const result: Record<string, unknown> = { ...base };

  if (options?.includeQuestions && 'questions' in exam) {
    result.questions = exam.questions
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((eq) => ({
        orderIndex: eq.orderIndex,
        question: {
          id: eq.question.id,
          content: eq.question.content,
          difficulty: eq.question.difficulty,
          points: Number(eq.question.points),
          options: eq.question.options.map((o) => ({
            id: o.id,
            label: o.label,
            content: o.content,
            isCorrect: o.isCorrect,
          })),
        },
      }));
  }

  if (options?.includeAssignments && 'assignments' in exam) {
    result.assignments = exam.assignments.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      student: {
        id: a.student.id,
        email: a.student.email,
        fullName: a.student.fullName,
      },
      assignedAt: a.assignedAt.toISOString(),
    }));
  }

  return result;
}

async function getOwnedExam(teacherId: string, examId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) {
    throw new AppError(404, 'NOT_FOUND', 'Exam not found');
  }
  if (exam.createdBy !== teacherId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not own this exam');
  }
  return exam;
}

function assertDraft(exam: { status: ExamStatus }, action: string) {
  if (exam.status !== ExamStatus.DRAFT) {
    throw new AppError(400, 'VALIDATION_ERROR', `Cannot ${action} a non-draft exam`);
  }
}

export async function listExams(teacherId: string) {
  const exams = await prisma.exam.findMany({
    where: { createdBy: teacherId },
    orderBy: { createdAt: 'desc' },
  });
  return exams.map((e) => toExamDto(e));
}

export async function createExam(teacherId: string, input: CreateExamInput) {
  await getOwnedSubject(teacherId, input.subjectId);

  const exam = await prisma.exam.create({
    data: {
      subjectId: input.subjectId,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      openAt: new Date(input.openAt),
      closeAt: new Date(input.closeAt),
      maxAttempts: input.maxAttempts,
      showAnswersAfterSubmit: input.showAnswersAfterSubmit,
      status: ExamStatus.DRAFT,
      createdBy: teacherId,
    },
  });

  return toExamDto(exam);
}

export async function getExam(teacherId: string, examId: string) {
  await getOwnedExam(teacherId, examId);

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { include: { question: { include: { options: true } } } },
      assignments: { include: { student: true } },
    },
  });

  return toExamDto(exam!, {
    includeQuestions: true,
    includeAssignments: true,
  });
}

export async function updateExam(teacherId: string, examId: string, input: UpdateExamInput) {
  const existing = await getOwnedExam(teacherId, examId);
  assertDraft(existing, 'update');

  if (input.openAt && input.closeAt && new Date(input.closeAt) <= new Date(input.openAt)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'closeAt must be after openAt');
  }

  const exam = await prisma.exam.update({
    where: { id: examId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.openAt !== undefined ? { openAt: new Date(input.openAt) } : {}),
      ...(input.closeAt !== undefined ? { closeAt: new Date(input.closeAt) } : {}),
      ...(input.maxAttempts !== undefined ? { maxAttempts: input.maxAttempts } : {}),
      ...(input.showAnswersAfterSubmit !== undefined
        ? { showAnswersAfterSubmit: input.showAnswersAfterSubmit }
        : {}),
    },
  });

  return toExamDto(exam);
}

export async function deleteExam(teacherId: string, examId: string) {
  const exam = await getOwnedExam(teacherId, examId);
  assertDraft(exam, 'delete');
  await prisma.exam.delete({ where: { id: examId } });
}

export async function setExamQuestions(
  teacherId: string,
  examId: string,
  input: SetExamQuestionsInput,
) {
  const exam = await getOwnedExam(teacherId, examId);
  assertDraft(exam, 'modify questions on');

  const questions = await prisma.question.findMany({
    where: {
      id: { in: input.questionIds },
      subjectId: exam.subjectId,
      subject: { teacherId },
    },
  });

  if (questions.length !== input.questionIds.length) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'All questions must belong to the exam subject and be owned by you',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.examQuestion.deleteMany({ where: { examId } });
    for (let i = 0; i < input.questionIds.length; i++) {
      await tx.examQuestion.create({
        data: {
          examId,
          questionId: input.questionIds[i],
          orderIndex: i + 1,
        },
      });
    }
  });

  return getExam(teacherId, examId);
}

export async function updateExamStatus(
  teacherId: string,
  examId: string,
  input: UpdateExamStatusInput,
) {
  const exam = await getOwnedExam(teacherId, examId);

  if (input.status === ExamStatus.PUBLISHED) {
    if (exam.status !== ExamStatus.DRAFT) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Only draft exams can be published');
    }
    const questionCount = await prisma.examQuestion.count({ where: { examId } });
    if (questionCount === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Exam must have at least one question to publish');
    }
    if (exam.closeAt <= exam.openAt) {
      throw new AppError(400, 'VALIDATION_ERROR', 'closeAt must be after openAt');
    }
  }

  if (input.status === ExamStatus.CLOSED) {
    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Only published exams can be closed');
    }
  }

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: { status: input.status },
  });

  return toExamDto(updated);
}

export async function assignStudents(
  teacherId: string,
  examId: string,
  input: AssignStudentsInput,
) {
  const exam = await getOwnedExam(teacherId, examId);

  if (exam.status === ExamStatus.CLOSED) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Cannot assign students to a closed exam');
  }

  const students = await prisma.user.findMany({
    where: {
      id: { in: input.studentIds },
      role: Role.STUDENT,
      isActive: true,
    },
  });

  if (students.length !== input.studentIds.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'All student IDs must be active students');
  }

  const created = [];
  for (const studentId of input.studentIds) {
    try {
      const assignment = await prisma.examAssignment.create({
        data: {
          examId,
          studentId,
          assignedBy: teacherId,
        },
        include: { student: true },
      });
      created.push({
        id: assignment.id,
        studentId: assignment.studentId,
        student: {
          id: assignment.student.id,
          email: assignment.student.email,
          fullName: assignment.student.fullName,
        },
        assignedAt: assignment.assignedAt.toISOString(),
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(409, 'VALIDATION_ERROR', 'Student is already assigned to this exam');
      }
      throw err;
    }
  }

  return created;
}

export async function listAssignments(teacherId: string, examId: string) {
  await getOwnedExam(teacherId, examId);

  const assignments = await prisma.examAssignment.findMany({
    where: { examId },
    include: { student: true },
    orderBy: { assignedAt: 'desc' },
  });

  return assignments.map((a) => ({
    id: a.id,
    studentId: a.studentId,
    student: {
      id: a.student.id,
      email: a.student.email,
      fullName: a.student.fullName,
    },
    assignedAt: a.assignedAt.toISOString(),
  }));
}

export async function removeAssignment(
  teacherId: string,
  examId: string,
  assignmentId: string,
) {
  await getOwnedExam(teacherId, examId);

  const assignment = await prisma.examAssignment.findFirst({
    where: { id: assignmentId, examId },
    include: { attempts: true },
  });

  if (!assignment) {
    throw new AppError(404, 'NOT_FOUND', 'Assignment not found');
  }

  const hasAttempts = assignment.attempts.some(
    (a) =>
      a.status === AttemptStatus.IN_PROGRESS ||
      a.status === AttemptStatus.SUBMITTED ||
      a.status === AttemptStatus.EXPIRED,
  );

  if (hasAttempts) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Cannot remove assignment after student has started or completed the exam',
    );
  }

  await prisma.examAssignment.delete({ where: { id: assignmentId } });
}

export async function getExamResults(teacherId: string, examId: string) {
  await getOwnedExam(teacherId, examId);

  const attempts = await prisma.examAttempt.findMany({
    where: { assignment: { examId } },
    include: {
      assignment: { include: { student: true } },
    },
    orderBy: { startedAt: 'desc' },
  });

  return attempts.map((a) => ({
    attemptId: a.id,
    studentId: a.assignment.studentId,
    studentName: a.assignment.student.fullName,
    studentEmail: a.assignment.student.email,
    status: a.status,
    score: a.score !== null ? Number(a.score) : null,
    maxScore: Number(a.maxScore),
    startedAt: a.startedAt.toISOString(),
    submittedAt: a.submittedAt?.toISOString() ?? null,
  }));
}

export async function getExamAttemptResult(
  teacherId: string,
  examId: string,
  attemptId: string,
) {
  return attemptService.getAttemptResultForTeacher(teacherId, examId, attemptId);
}
