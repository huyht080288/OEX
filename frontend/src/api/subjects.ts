import { apiClient, unwrap } from './client';
import type { CreateSubjectPayload, Subject } from '@/types/teacher';

export async function fetchSubjects(): Promise<Subject[]> {
  return unwrap(apiClient.get('/subjects'));
}

export async function createSubject(payload: CreateSubjectPayload): Promise<Subject> {
  return unwrap(apiClient.post('/subjects', payload));
}

export async function updateSubject(
  id: string,
  payload: Partial<CreateSubjectPayload>,
): Promise<Subject> {
  return unwrap(apiClient.put(`/subjects/${id}`, payload));
}

export async function deleteSubject(id: string): Promise<void> {
  await unwrap(apiClient.delete(`/subjects/${id}`));
}
