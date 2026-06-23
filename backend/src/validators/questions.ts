import { z } from 'zod';
import { Difficulty } from '@prisma/client';

const optionSchema = z.object({
  label: z.string().length(1),
  content: z.string().min(1),
  isCorrect: z.boolean(),
});

export const createQuestionSchema = z.object({
  subjectId: z.string().uuid(),
  content: z.string().min(1),
  difficulty: z.nativeEnum(Difficulty),
  points: z.number().positive().max(999.99),
  options: z.array(optionSchema).min(2).max(6),
});

export const updateQuestionSchema = z.object({
  content: z.string().min(1).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  points: z.number().positive().max(999.99).optional(),
  options: z.array(optionSchema).min(2).max(6).optional(),
});

export const listQuestionsQuerySchema = z.object({
  subjectId: z.string().uuid().optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  q: z.string().optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>;
