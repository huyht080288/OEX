import { apiClient, unwrap } from './client';
import type { StudentSummary } from '@/types/teacher';

export async function fetchStudents(search?: string): Promise<StudentSummary[]> {
  return unwrap(apiClient.get('/students', { params: search ? { search } : undefined }));
}
