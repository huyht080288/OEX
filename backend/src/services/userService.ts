import bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { toPublicUser } from '../lib/userDto.js';
import {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
} from '../validators/users.js';

function handlePrismaUniqueError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Email already in use');
  }
  throw err;
}

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    where.role = query.role;
  }

  if (query.search) {
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { fullName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return users.map(toPublicUser);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  return toPublicUser(user);
}

export async function createUser(input: CreateUserInput) {
  const passwordHash = await bcrypt.hash(input.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
      },
    });
    return toPublicUser(user);
  } catch (err) {
    handlePrismaUniqueError(err);
  }
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.role !== undefined ? { role: input.role as Role } : {}),
      },
    });
    return toPublicUser(user);
  } catch (err) {
    handlePrismaUniqueError(err);
  }
}

export async function updateUserStatus(id: string, isActive: boolean) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive },
  });
  return toPublicUser(user);
}
