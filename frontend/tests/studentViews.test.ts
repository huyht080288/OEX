// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  route: { params: { attemptId: 'attempt-result' } },
  fetchMyExams: vi.fn(),
  startAttempt: vi.fn(),
  fetchAttemptResult: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
  useRoute: () => mocks.route,
}));

vi.mock('@/api/dashboard', () => ({
  fetchMyExams: mocks.fetchMyExams,
}));

vi.mock('@/api/attempts', () => ({
  startAttempt: mocks.startAttempt,
  fetchAttemptResult: mocks.fetchAttemptResult,
}));

import MyExamsView from '@/views/student/MyExamsView.vue';
import ResultView from '@/views/student/ResultView.vue';

const baseExam = {
  id: 'exam-1',
  title: 'Midterm',
  subjectName: 'Computer Science',
  status: 'PUBLISHED',
  durationMinutes: 60,
  openAt: '2020-01-01T00:00:00.000Z',
  closeAt: '2099-01-01T00:00:00.000Z',
};

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    assignmentId: 'assignment-start',
    exam: baseExam,
    attemptCount: 0,
    maxAttempts: 2,
    hasInProgress: false,
    inProgressAttemptId: null,
    lastCompletedAttemptId: null,
    bestScore: null,
    lastAttemptStatus: null,
    ...overrides,
  };
}

const globalStubs = {
  RouterLink: { template: '<a><slot /></a>' },
  LoadingState: { template: '<p>Loading</p>' },
  ErrorState: { props: ['message'], template: '<p class="error">{{ message }}</p>' },
  EmptyState: { props: ['title'], template: '<p class="empty">{{ title }}</p>' },
  StatusBadge: { props: ['status'], template: '<span>{{ status }}</span>' },
};

describe('MyExamsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('renders empty and error states', async () => {
    mocks.fetchMyExams.mockResolvedValueOnce([]);
    const empty = mount(MyExamsView, { global: { stubs: globalStubs } });
    await flushPromises();
    expect(empty.text()).toContain('No assigned exams');

    mocks.fetchMyExams.mockRejectedValueOnce(new Error('Cannot load exams'));
    const failed = mount(MyExamsView, { global: { stubs: globalStubs } });
    await flushPromises();
    expect(failed.get('.error').text()).toBe('Cannot load exams');
  });

  it('starts, resumes, and opens results for assignments', async () => {
    mocks.fetchMyExams.mockResolvedValue([
      assignment(),
      assignment({
        assignmentId: 'assignment-resume',
        hasInProgress: true,
        inProgressAttemptId: 'attempt-running',
      }),
      assignment({
        assignmentId: 'assignment-result',
        attemptCount: 2,
        lastAttemptStatus: 'SUBMITTED',
        lastCompletedAttemptId: 'attempt-complete',
      }),
    ]);
    mocks.startAttempt.mockResolvedValue({ attemptId: 'attempt-new' });
    const wrapper = mount(MyExamsView, { global: { stubs: globalStubs } });
    await flushPromises();
    const buttons = wrapper.findAll('button');

    await buttons[0].trigger('click');
    await flushPromises();
    expect(mocks.startAttempt).toHaveBeenCalledWith('assignment-start');
    expect(mocks.push).toHaveBeenCalledWith('/take/attempt-new');

    await buttons[1].trigger('click');
    expect(mocks.push).toHaveBeenCalledWith('/take/attempt-running');

    await buttons[2].trigger('click');
    expect(mocks.push).toHaveBeenCalledWith('/results/attempt-complete');
  });

  it('reports a failed start and reloads assignments', async () => {
    mocks.fetchMyExams.mockResolvedValue([assignment()]);
    mocks.startAttempt.mockRejectedValue(new Error('Cannot start'));
    const wrapper = mount(MyExamsView, { global: { stubs: globalStubs } });
    await flushPromises();

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Cannot start');
    expect(mocks.fetchMyExams).toHaveBeenCalledTimes(2);
  });
});

describe('ResultView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders score and answer review', async () => {
    mocks.fetchAttemptResult.mockResolvedValue({
      attemptId: 'attempt-result',
      examTitle: 'Midterm',
      status: 'SUBMITTED',
      score: 2,
      maxScore: 3,
      correctCount: 1,
      totalQuestions: 2,
      submittedAt: '2026-07-17T10:00:00.000Z',
      review: [
        {
          questionId: 'q1',
          content: 'Correct question',
          selectedOption: { id: 'o1', label: 'A', content: 'Answer A' },
          correctOption: { id: 'o1', label: 'A', content: 'Answer A' },
          selectedOptionId: 'o1',
          correctOptionId: 'o1',
          isCorrect: true,
          points: 1,
        },
        {
          questionId: 'q2',
          content: 'Incorrect question',
          selectedOption: null,
          correctOption: { id: 'o2', label: 'B', content: 'Answer B' },
          selectedOptionId: null,
          correctOptionId: 'o2',
          isCorrect: false,
          points: 2,
        },
      ],
    });

    const wrapper = mount(ResultView, { global: { stubs: globalStubs } });
    await flushPromises();

    expect(mocks.fetchAttemptResult).toHaveBeenCalledWith('attempt-result');
    expect(wrapper.text()).toContain('Your score: 2 / 3');
    expect(wrapper.text()).toContain('No answer');
    expect(wrapper.text()).toContain('Correct answer: Answer B');
  });

  it('renders an API error', async () => {
    mocks.fetchAttemptResult.mockRejectedValue(new Error('Result unavailable'));
    const wrapper = mount(ResultView, { global: { stubs: globalStubs } });
    await flushPromises();

    expect(wrapper.get('.error').text()).toBe('Result unavailable');
  });
});
