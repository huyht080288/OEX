import { apiClient, unwrap } from './client';
import type { AttemptReviewItem, InProgressAttempt, AttemptResult } from '@/types/student';

export async function startAttempt(assignmentId: string): Promise<InProgressAttempt> {
  return unwrap(apiClient.post('/attempts/start', { assignmentId }));
}

export async function fetchAttempt(attemptId: string): Promise<InProgressAttempt> {
  return unwrap(apiClient.get(`/attempts/${attemptId}`));
}

export async function saveAnswers(
  attemptId: string,
  answers: { questionId: string; selectedOptionId: string | null }[],
): Promise<InProgressAttempt> {
  return unwrap(apiClient.put(`/attempts/${attemptId}/answers`, { answers }));
}

export async function submitAttempt(attemptId: string): Promise<{
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
  review: AttemptReviewItem[];
}> {
  return unwrap(apiClient.post(`/attempts/${attemptId}/submit`));
}

export async function fetchAttemptResult(attemptId: string): Promise<AttemptResult> {
  return unwrap(apiClient.get(`/attempts/${attemptId}/result`));
}
