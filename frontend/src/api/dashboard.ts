import { apiClient, unwrap } from './client';
import type { Subject, ExamSummary, MyExamAssignment, UserSummary } from '@/types/dashboard';

export async function fetchUsers(): Promise<UserSummary[]> {
  return unwrap(apiClient.get('/users'));
}

export async function fetchSubjects(): Promise<Subject[]> {
  return unwrap(apiClient.get('/subjects'));
}

export async function fetchExams(): Promise<ExamSummary[]> {
  return unwrap(apiClient.get('/exams'));
}

export async function fetchMyExams(): Promise<MyExamAssignment[]> {
  return unwrap(apiClient.get('/my-exams'));
}
