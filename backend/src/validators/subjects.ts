import { z } from 'zod';

export const createSubjectSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export const updateSubjectSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
