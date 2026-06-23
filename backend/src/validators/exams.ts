import { z } from 'zod';
import { ExamStatus } from '@prisma/client';

export const createExamSchema = z
  .object({
    subjectId: z.string().uuid(),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    durationMinutes: z.number().int().positive(),
    openAt: z.string().datetime(),
    closeAt: z.string().datetime(),
    maxAttempts: z.number().int().positive().default(1),
    showAnswersAfterSubmit: z.boolean().default(false),
  })
  .refine((data) => new Date(data.closeAt) > new Date(data.openAt), {
    message: 'closeAt must be after openAt',
    path: ['closeAt'],
  });

export const updateExamSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    durationMinutes: z.number().int().positive().optional(),
    openAt: z.string().datetime().optional(),
    closeAt: z.string().datetime().optional(),
    maxAttempts: z.number().int().positive().optional(),
    showAnswersAfterSubmit: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.openAt && data.closeAt) {
        return new Date(data.closeAt) > new Date(data.openAt);
      }
      return true;
    },
    { message: 'closeAt must be after openAt', path: ['closeAt'] },
  );

export const setExamQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

export const updateExamStatusSchema = z.object({
  status: z.enum([ExamStatus.PUBLISHED, ExamStatus.CLOSED]),
});

export const assignStudentsSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type SetExamQuestionsInput = z.infer<typeof setExamQuestionsSchema>;
export type UpdateExamStatusInput = z.infer<typeof updateExamStatusSchema>;
export type AssignStudentsInput = z.infer<typeof assignStudentsSchema>;
