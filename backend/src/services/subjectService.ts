import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { CreateSubjectInput, UpdateSubjectInput } from '../validators/subjects.js';

function toSubjectDto(subject: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: subject.id,
    code: subject.code,
    name: subject.name,
    description: subject.description,
    teacherId: subject.teacherId,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString(),
  };
}

function handleUniqueCodeError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Subject code already exists for this teacher');
  }
  throw err;
}

async function getOwnedSubject(teacherId: string, subjectId: string) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    throw new AppError(404, 'NOT_FOUND', 'Subject not found');
  }
  if (subject.teacherId !== teacherId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not own this subject');
  }
  return subject;
}

export async function listSubjects(teacherId: string) {
  const subjects = await prisma.subject.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'desc' },
  });
  return subjects.map(toSubjectDto);
}

export async function createSubject(teacherId: string, input: CreateSubjectInput) {
  try {
    const subject = await prisma.subject.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        teacherId,
      },
    });
    return toSubjectDto(subject);
  } catch (err) {
    handleUniqueCodeError(err);
  }
}

export async function getSubject(teacherId: string, subjectId: string) {
  const subject = await getOwnedSubject(teacherId, subjectId);
  return toSubjectDto(subject);
}

export async function updateSubject(
  teacherId: string,
  subjectId: string,
  input: UpdateSubjectInput,
) {
  await getOwnedSubject(teacherId, subjectId);

  try {
    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });
    return toSubjectDto(subject);
  } catch (err) {
    handleUniqueCodeError(err);
  }
}

export async function deleteSubject(teacherId: string, subjectId: string) {
  await getOwnedSubject(teacherId, subjectId);

  const [questionCount, examCount] = await Promise.all([
    prisma.question.count({ where: { subjectId } }),
    prisma.exam.count({ where: { subjectId } }),
  ]);

  if (questionCount > 0 || examCount > 0) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Cannot delete subject with existing questions or exams',
    );
  }

  await prisma.subject.delete({ where: { id: subjectId } });
}

export { getOwnedSubject };
