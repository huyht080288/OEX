// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  route: { params: { id: 'exam-1', attemptId: 'attempt-1' } },
  push: vi.fn(),
  fetchExam: vi.fn(),
  fetchExamResults: vi.fn(),
  fetchExamAttemptResult: vi.fn(),
  fetchExams: vi.fn(),
  deleteExam: vi.fn(),
  fetchSubjects: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/api/exams', () => ({
  fetchExam: mocks.fetchExam,
  fetchExamResults: mocks.fetchExamResults,
  fetchExamAttemptResult: mocks.fetchExamAttemptResult,
  fetchExams: mocks.fetchExams,
  deleteExam: mocks.deleteExam,
}));

vi.mock('@/api/subjects', () => ({
  fetchSubjects: mocks.fetchSubjects,
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

import ExamListView from '@/views/teacher/ExamListView.vue';
import ExamResultsView from '@/views/teacher/ExamResultsView.vue';
import TeacherAttemptDetailView from '@/views/teacher/TeacherAttemptDetailView.vue';

const stubs = {
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
  LoadingState: { template: '<p>Loading</p>' },
  ErrorState: { props: ['message'], template: '<p class="error">{{ message }}</p>' },
  EmptyState: { props: ['title'], template: '<p class="empty">{{ title }}</p>' },
  StatusBadge: { props: ['status'], template: '<span>{{ status }}</span>' },
};

describe('teacher exam result views', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the exam results table', async () => {
    mocks.fetchExam.mockResolvedValue({ title: 'Midterm' });
    mocks.fetchExamResults.mockResolvedValue([
      {
        attemptId: 'attempt-1',
        studentName: 'Student One',
        studentEmail: 'student@oex.test',
        score: 8,
        maxScore: 10,
        submittedAt: '2026-07-17T10:00:00.000Z',
        status: 'SUBMITTED',
      },
      {
        attemptId: 'attempt-2',
        studentName: 'Student Two',
        studentEmail: 'student2@oex.test',
        score: null,
        maxScore: 10,
        submittedAt: null,
        status: 'IN_PROGRESS',
      },
    ]);

    const wrapper = mount(ExamResultsView, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('Midterm');
    expect(wrapper.text()).toContain('Student One');
    expect(wrapper.text()).toContain('View Detail');
  });

  it('renders a result loading error', async () => {
    mocks.fetchExam.mockRejectedValue(new Error('Results unavailable'));
    mocks.fetchExamResults.mockResolvedValue([]);
    const wrapper = mount(ExamResultsView, { global: { stubs } });
    await flushPromises();

    expect(wrapper.get('.error').text()).toBe('Results unavailable');
  });

  it('loads teacher attempt details and review', async () => {
    mocks.fetchExamAttemptResult.mockResolvedValue({
      examTitle: 'Midterm',
      studentName: 'Student One',
      studentEmail: 'student@oex.test',
      status: 'SUBMITTED',
      score: 1,
      maxScore: 2,
      correctCount: 1,
      totalQuestions: 2,
      submittedAt: '2026-07-17T10:00:00.000Z',
      review: [
        {
          questionId: 'q1',
          content: 'Question',
          selectedOption: null,
          correctOption: { id: 'o1', label: 'A', content: 'Correct' },
          isCorrect: false,
          points: 2,
        },
      ],
    });
    const wrapper = mount(TeacherAttemptDetailView, { global: { stubs } });
    await flushPromises();

    expect(mocks.fetchExamAttemptResult).toHaveBeenCalledWith('exam-1', 'attempt-1');
    expect(wrapper.text()).toContain('Student answer: No answer');
    expect(wrapper.text()).toContain('Correct answer: A. Correct');
  });
});

describe('ExamListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    mocks.fetchExams.mockResolvedValue([
      {
        id: 'exam-1',
        title: 'Draft Exam',
        subjectId: 'subject-1',
        status: 'DRAFT',
        openAt: '2026-07-17T09:00:00.000Z',
        closeAt: '2026-07-17T11:00:00.000Z',
      },
    ]);
    mocks.fetchSubjects.mockResolvedValue([{ id: 'subject-1', name: 'Computer Science' }]);
    mocks.deleteExam.mockResolvedValue(undefined);
  });

  it('loads and deletes a draft exam', async () => {
    const wrapper = mount(ExamListView, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('Computer Science');
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(mocks.deleteExam).toHaveBeenCalledWith('exam-1');
    expect(mocks.showToast).toHaveBeenCalledWith('Exam deleted.');
  });

  it('does not delete when confirmation is cancelled', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const wrapper = mount(ExamListView, { global: { stubs } });
    await flushPromises();

    await wrapper.get('button').trigger('click');
    expect(mocks.deleteExam).not.toHaveBeenCalled();
  });
});
