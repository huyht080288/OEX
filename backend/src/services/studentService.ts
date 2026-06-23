import { Role, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export async function listStudents(search?: string) {
  const where: Prisma.UserWhereInput = {
    role: Role.STUDENT,
    isActive: true,
  };

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const students = await prisma.user.findMany({
    where,
    orderBy: { fullName: 'asc' },
    select: { id: true, email: true, fullName: true },
  });

  return students;
}
