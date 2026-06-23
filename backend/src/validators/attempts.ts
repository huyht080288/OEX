import { z } from 'zod';

export const startAttemptSchema = z.object({
  assignmentId: z.string().uuid(),
});

export const saveAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        selectedOptionId: z.string().uuid().nullable(),
      }),
    )
    .min(1),
});

export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export type SaveAnswersInput = z.infer<typeof saveAnswersSchema>;
