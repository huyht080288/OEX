import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { getOwnedSubject } from './subjectService.js';
import {
  CreateQuestionInput,
  UpdateQuestionInput,
  ListQuestionsQuery,
} from '../validators/questions.js';

type QuestionWithOptions = Prisma.QuestionGetPayload<{ include: { options: true } }>;

function assertSingleCorrect(options: { isCorrect: boolean }[]) {
  const correctCount = options.filter((o) => o.isCorrect).length;
  if (correctCount !== 1) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Select exactly one correct answer');
  }
}

function toQuestionDto(question: QuestionWithOptions) {
  return {
    id: question.id,
    subjectId: question.subjectId,
    content: question.content,
    difficulty: question.difficulty,
    points: Number(question.points),
    createdBy: question.createdBy,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
    options: question.options.map((o) => ({
      id: o.id,
      label: o.label,
      content: o.content,
      isCorrect: o.isCorrect,
    })),
  };
}

async function getOwnedQuestion(teacherId: string, questionId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: true, subject: true },
  });
  if (!question) {
    throw new AppError(404, 'NOT_FOUND', 'Question not found');
  }
  if (question.subject.teacherId !== teacherId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not own this question');
  }
  return question;
}

export async function listQuestions(teacherId: string, query: ListQuestionsQuery) {
  const where: Prisma.QuestionWhereInput = {
    subject: { teacherId },
  };

  if (query.subjectId) {
    await getOwnedSubject(teacherId, query.subjectId);
    where.subjectId = query.subjectId;
  }
  if (query.difficulty) {
    where.difficulty = query.difficulty;
  }
  if (query.q) {
    where.content = { contains: query.q, mode: 'insensitive' };
  }

  const questions = await prisma.question.findMany({
    where,
    include: { options: true },
    orderBy: { createdAt: 'desc' },
  });

  return questions.map(toQuestionDto);
}

export async function createQuestion(teacherId: string, input: CreateQuestionInput) {
  await getOwnedSubject(teacherId, input.subjectId);
  assertSingleCorrect(input.options);

  const question = await prisma.question.create({
    data: {
      subjectId: input.subjectId,
      content: input.content,
      difficulty: input.difficulty,
      points: input.points,
      createdBy: teacherId,
      options: {
        create: input.options.map((o) => ({
          label: o.label,
          content: o.content,
          isCorrect: o.isCorrect,
        })),
      },
    },
    include: { options: true },
  });

  return toQuestionDto(question);
}

export async function getQuestion(teacherId: string, questionId: string) {
  const question = await getOwnedQuestion(teacherId, questionId);
  return toQuestionDto(question);
}

export async function updateQuestion(
  teacherId: string,
  questionId: string,
  input: UpdateQuestionInput,
) {
  await getOwnedQuestion(teacherId, questionId);

  if (input.options) {
    assertSingleCorrect(input.options);
  }

  const question = await prisma.$transaction(async (tx) => {
    if (input.options) {
      await tx.questionOption.deleteMany({ where: { questionId } });
    }

    return tx.question.update({
      where: { id: questionId },
      data: {
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
        ...(input.points !== undefined ? { points: input.points } : {}),
        ...(input.options
          ? {
              options: {
                create: input.options.map((o) => ({
                  label: o.label,
                  content: o.content,
                  isCorrect: o.isCorrect,
                })),
              },
            }
          : {}),
      },
      include: { options: true },
    });
  });

  return toQuestionDto(question);
}

export async function deleteQuestion(teacherId: string, questionId: string) {
  await getOwnedQuestion(teacherId, questionId);
  await prisma.question.delete({ where: { id: questionId } });
}
