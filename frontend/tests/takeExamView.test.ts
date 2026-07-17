// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  route: { params: { attemptId: 'attempt-1' } },
  replace: vi.fn(),
  fetchAttempt: vi.fn(),
  saveAnswers: vi.fn(),
  submitAttempt: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/api/attempts', () => ({
  fetchAttempt: mocks.fetchAttempt,
  saveAnswers: mocks.saveAnswers,
  submitAttempt: mocks.submitAttempt,
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

import TakeExamView from '@/views/student/TakeExamView.vue';

const attempt = {
  attemptId: 'attempt-1',
  examTitle: 'Midterm',
  expiresAt: '2026-07-17T11:00:00.000Z',
  questions: [
    {
      id: 'q1',
      orderIndex: 0,
      content: 'Question one?',
      points: 1,
      options: [
        { id: 'o1', label: 'A', content: 'One' },
        { id: 'o2', label: 'B', content: 'Two' },
      ],
    },
    {
      id: 'q2',
      orderIndex: 1,
      content: 'Question two?',
      points: 1,
      options: [
        { id: 'o3', label: 'A', content: 'Three' },
        { id: 'o4', label: 'B', content: 'Four' },
      ],
    },
  ],
  answers: { q1: null, q2: null },
};

function mountView() {
  return mount(TakeExamView, {
    global: {
      stubs: {
        LoadingState: { template: '<p>Loading</p>' },
        ErrorState: { props: ['message'], template: '<p class="error">{{ message }}</p>' },
        OexMark: { template: '<span>OEX</span>' },
      },
    },
  });
}

describe('TakeExamView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T10:00:00.000Z'));
    mocks.fetchAttempt.mockResolvedValue(structuredClone(attempt));
    mocks.saveAnswers.mockImplementation(async () => structuredClone(attempt));
    mocks.submitAttempt.mockResolvedValue({});
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads, navigates, autosaves, and submits an attempt', async () => {
    const wrapper = mountView();
    await flushPromises();
    const vm = wrapper.vm as unknown as Record<string, (...args: unknown[]) => unknown>;

    expect(wrapper.text()).toContain('Question one?');
    vm.goNext();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Question two?');
    vm.goPrev();

    const radio = wrapper.find('input[type="radio"]');
    await radio.setValue(true);
    vi.advanceTimersByTime(500);
    await flushPromises();
    expect(mocks.saveAnswers).toHaveBeenCalled();

    vm.openSubmitModal();
    vm.closeSubmitModal();
    await vm.confirmSubmit();
    await flushPromises();

    expect(mocks.submitAttempt).toHaveBeenCalledWith('attempt-1');
    expect(mocks.showToast).toHaveBeenCalledWith('Exam submitted.');
    expect(mocks.replace).toHaveBeenCalledWith('/results/attempt-1');
  });

  it('redirects an expired attempt during load', async () => {
    mocks.fetchAttempt.mockRejectedValue(
      Object.assign(new Error('Expired'), { code: 'ATTEMPT_EXPIRED' }),
    );

    mountView();
    await flushPromises();

    expect(mocks.replace).toHaveBeenCalledWith('/results/attempt-1');
  });

  it('automatically submits when time expires', async () => {
    mocks.fetchAttempt.mockResolvedValue({
      ...structuredClone(attempt),
      expiresAt: '2026-07-17T09:59:59.000Z',
    });

    mountView();
    await flushPromises();

    expect(mocks.submitAttempt).toHaveBeenCalledWith('attempt-1');
    expect(mocks.showToast).toHaveBeenCalledWith('Time is up. Your exam has been submitted.');
    expect(mocks.replace).toHaveBeenCalledWith('/results/attempt-1');
  });
});
