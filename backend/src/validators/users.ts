import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).max(255),
  role: z.nativeEnum(Role),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).max(255).optional(),
  role: z.nativeEnum(Role).optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const listUsersQuerySchema = z.object({
  role: z.nativeEnum(Role).optional(),
  search: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
