import { apiClient, unwrap } from './client';
import type { CreateQuestionPayload, Difficulty, Question } from '@/types/teacher';

export interface ListQuestionsParams {
  subjectId?: string;
  difficulty?: Difficulty;
  q?: string;
}

export async function fetchQuestions(params?: ListQuestionsParams): Promise<Question[]> {
  return unwrap(apiClient.get('/questions', { params }));
}

export async function fetchQuestion(id: string): Promise<Question> {
  return unwrap(apiClient.get(`/questions/${id}`));
}

export async function createQuestion(payload: CreateQuestionPayload): Promise<Question> {
  return unwrap(apiClient.post('/questions', payload));
}

export async function updateQuestion(
  id: string,
  payload: Partial<CreateQuestionPayload>,
): Promise<Question> {
  return unwrap(apiClient.put(`/questions/${id}`, payload));
}

export async function deleteQuestion(id: string): Promise<void> {
  await unwrap(apiClient.delete(`/questions/${id}`));
}
