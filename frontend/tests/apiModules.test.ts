import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/client';
import * as attemptsApi from '@/api/attempts';
import * as authApi from '@/api/auth';
import * as dashboardApi from '@/api/dashboard';
import * as examsApi from '@/api/exams';
import * as questionsApi from '@/api/questions';
import * as studentsApi from '@/api/students';
import * as subjectsApi from '@/api/subjects';
import * as usersApi from '@/api/users';

function success<T>(data: T) {
  return Promise.resolve({ data: { success: true, data } }) as never;
}

describe('API modules', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls authentication endpoints', async () => {
    const post = vi.spyOn(apiClient, 'post');
    const get = vi.spyOn(apiClient, 'get');
    const loginResult = { accessToken: 'token', expiresIn: 3600, user: { id: 'u1' } };
    post.mockReturnValueOnce(success(loginResult));
    get.mockReturnValueOnce(success(loginResult.user));
    post.mockReturnValueOnce(success(undefined));

    await expect(authApi.login({ email: 'a@b.com', password: 'secret' })).resolves.toBe(loginResult);
    await expect(authApi.fetchMe()).resolves.toBe(loginResult.user);
    await expect(authApi.changePassword('old', 'new-password')).resolves.toBeUndefined();

    expect(post).toHaveBeenNthCalledWith(1, '/auth/login', {
      email: 'a@b.com',
      password: 'secret',
    });
    expect(get).toHaveBeenCalledWith('/auth/me');
    expect(post).toHaveBeenNthCalledWith(2, '/auth/change-password', {
      currentPassword: 'old',
      newPassword: 'new-password',
    });
  });

  it('calls user endpoints', async () => {
    const get = vi.spyOn(apiClient, 'get').mockReturnValue(success([]));
    const post = vi.spyOn(apiClient, 'post').mockReturnValue(success({ id: 'u1' }));
    const put = vi.spyOn(apiClient, 'put').mockReturnValue(success({ id: 'u1' }));
    const patch = vi.spyOn(apiClient, 'patch').mockReturnValue(success({ id: 'u1' }));

    await usersApi.fetchUsers({ role: 'STUDENT', search: 'ann' });
    await usersApi.createUser({
      email: 'ann@example.com',
      password: 'password',
      fullName: 'Ann',
      role: 'STUDENT',
    });
    await usersApi.updateUser('u1', { fullName: 'Ann Two' });
    await usersApi.updateUserStatus('u1', false);

    expect(get).toHaveBeenCalledWith('/users', {
      params: { role: 'STUDENT', search: 'ann' },
    });
    expect(post).toHaveBeenCalledWith('/users', expect.objectContaining({ role: 'STUDENT' }));
    expect(put).toHaveBeenCalledWith('/users/u1', { fullName: 'Ann Two' });
    expect(patch).toHaveBeenCalledWith('/users/u1/status', { isActive: false });
  });

  it('calls subject and question endpoints', async () => {
    const get = vi.spyOn(apiClient, 'get').mockReturnValue(success([]));
    const post = vi.spyOn(apiClient, 'post').mockReturnValue(success({ id: 'item' }));
    const put = vi.spyOn(apiClient, 'put').mockReturnValue(success({ id: 'item' }));
    const remove = vi.spyOn(apiClient, 'delete').mockReturnValue(success(undefined));

    await subjectsApi.fetchSubjects();
    await subjectsApi.createSubject({ code: 'CS', name: 'Computer Science', description: null });
    await subjectsApi.updateSubject('s1', { name: 'Computing' });
    await subjectsApi.deleteSubject('s1');

    await questionsApi.fetchQuestions({ subjectId: 's1', difficulty: 'EASY', q: 'two' });
    await questionsApi.fetchQuestion('q1');
    await questionsApi.createQuestion({} as never);
    await questionsApi.updateQuestion('q1', {} as never);
    await questionsApi.deleteQuestion('q1');

    expect(get).toHaveBeenCalledWith('/subjects');
    expect(get).toHaveBeenCalledWith('/questions/q1');
    expect(post).toHaveBeenCalledWith('/questions', {});
    expect(put).toHaveBeenCalledWith('/questions/q1', {});
    expect(remove).toHaveBeenCalledWith('/questions/q1');
  });

  it('calls every exam endpoint', async () => {
    const get = vi.spyOn(apiClient, 'get').mockReturnValue(success([]));
    const post = vi.spyOn(apiClient, 'post').mockReturnValue(success([]));
    const put = vi.spyOn(apiClient, 'put').mockReturnValue(success({ id: 'e1' }));
    const patch = vi.spyOn(apiClient, 'patch').mockReturnValue(success({ id: 'e1' }));
    const remove = vi.spyOn(apiClient, 'delete').mockReturnValue(success(undefined));

    await examsApi.fetchExams();
    await examsApi.fetchExam('e1');
    await examsApi.createExam({} as never);
    await examsApi.updateExam('e1', { description: null });
    await examsApi.deleteExam('e1');
    await examsApi.setExamQuestions('e1', ['q1']);
    await examsApi.updateExamStatus('e1', 'PUBLISHED');
    await examsApi.assignStudents('e1', ['u1']);
    await examsApi.fetchExamAssignments('e1');
    await examsApi.removeAssignment('e1', 'a1');
    await examsApi.fetchExamResults('e1');
    await examsApi.fetchExamAttemptResult('e1', 'attempt1');

    expect(get).toHaveBeenCalledTimes(5);
    expect(post).toHaveBeenCalledWith('/exams/e1/assignments', { studentIds: ['u1'] });
    expect(put).toHaveBeenCalledWith('/exams/e1/questions', { questionIds: ['q1'] });
    expect(patch).toHaveBeenCalledWith('/exams/e1/status', { status: 'PUBLISHED' });
    expect(remove).toHaveBeenCalledWith('/exams/e1/assignments/a1');
  });

  it('calls attempt, dashboard, and student endpoints', async () => {
    const get = vi.spyOn(apiClient, 'get').mockReturnValue(success([]));
    const post = vi.spyOn(apiClient, 'post').mockReturnValue(success({}));
    const put = vi.spyOn(apiClient, 'put').mockReturnValue(success({}));

    await attemptsApi.startAttempt('assignment1');
    await attemptsApi.fetchAttempt('attempt1');
    await attemptsApi.saveAnswers('attempt1', [{ questionId: 'q1', selectedOptionId: 'o1' }]);
    await attemptsApi.submitAttempt('attempt1');
    await attemptsApi.fetchAttemptResult('attempt1');
    await dashboardApi.fetchUsers();
    await dashboardApi.fetchSubjects();
    await dashboardApi.fetchExams();
    await dashboardApi.fetchMyExams();
    await studentsApi.fetchStudents('ann');
    await studentsApi.fetchStudents();

    expect(post).toHaveBeenCalledWith('/attempts/start', { assignmentId: 'assignment1' });
    expect(put).toHaveBeenCalledWith('/attempts/attempt1/answers', {
      answers: [{ questionId: 'q1', selectedOptionId: 'o1' }],
    });
    expect(get).toHaveBeenCalledWith('/students', { params: { search: 'ann' } });
    expect(get).toHaveBeenCalledWith('/students', { params: undefined });
  });
});
