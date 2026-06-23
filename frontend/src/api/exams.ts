import { apiClient, unwrap } from './client';
import type {
  CreateExamPayload,
  Exam,
  ExamAssignment,
  ExamResultRow,
  ExamStatus,
  TeacherAttemptResult,
} from '@/types/teacher';

export async function fetchExams(): Promise<Exam[]> {
  return unwrap(apiClient.get('/exams'));
}

export async function fetchExam(id: string): Promise<Exam> {
  return unwrap(apiClient.get(`/exams/${id}`));
}

export async function createExam(payload: CreateExamPayload): Promise<Exam> {
  return unwrap(apiClient.post('/exams', payload));
}

export async function updateExam(
  id: string,
  payload: Partial<CreateExamPayload & { description: string | null }>,
): Promise<Exam> {
  return unwrap(apiClient.put(`/exams/${id}`, payload));
}

export async function deleteExam(id: string): Promise<void> {
  await unwrap(apiClient.delete(`/exams/${id}`));
}

export async function setExamQuestions(id: string, questionIds: string[]): Promise<Exam> {
  return unwrap(apiClient.put(`/exams/${id}/questions`, { questionIds }));
}

export async function updateExamStatus(id: string, status: ExamStatus): Promise<Exam> {
  return unwrap(apiClient.patch(`/exams/${id}/status`, { status }));
}

export async function assignStudents(
  examId: string,
  studentIds: string[],
): Promise<ExamAssignment[]> {
  return unwrap(apiClient.post(`/exams/${examId}/assignments`, { studentIds }));
}

export async function fetchExamAssignments(examId: string): Promise<ExamAssignment[]> {
  return unwrap(apiClient.get(`/exams/${examId}/assignments`));
}

export async function removeAssignment(examId: string, assignmentId: string): Promise<void> {
  await unwrap(apiClient.delete(`/exams/${examId}/assignments/${assignmentId}`));
}

export async function fetchExamResults(examId: string): Promise<ExamResultRow[]> {
  return unwrap(apiClient.get(`/exams/${examId}/results`));
}

export async function fetchExamAttemptResult(
  examId: string,
  attemptId: string,
): Promise<TeacherAttemptResult> {
  return unwrap(apiClient.get(`/exams/${examId}/attempts/${attemptId}`));
}
