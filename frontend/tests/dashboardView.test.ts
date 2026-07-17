// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  user: { value: null as null | { fullName: string; role: string } },
  fetchUsers: vi.fn(),
  fetchSubjects: vi.fn(),
  fetchExams: vi.fn(),
  fetchMyExams: vi.fn(),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get user() {
      return mocks.user.value;
    },
  }),
}));

vi.mock('@/api/dashboard', () => ({
  fetchUsers: mocks.fetchUsers,
  fetchSubjects: mocks.fetchSubjects,
  fetchExams: mocks.fetchExams,
  fetchMyExams: mocks.fetchMyExams,
}));

import DashboardView from '@/views/DashboardView.vue';

function mountDashboard() {
  return mount(DashboardView, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        LoadingState: { template: '<p>Loading</p>' },
        ErrorState: { props: ['message'], template: '<p class="error">{{ message }}</p>' },
        EmptyState: { template: '<p>Empty</p>' },
      },
    },
  });
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.value = null;
  });

  it('does not fetch data without an authenticated user', async () => {
    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Dashboard');
    expect(mocks.fetchUsers).not.toHaveBeenCalled();
  });

  it('loads the admin summary', async () => {
    mocks.user.value = { fullName: 'Admin', role: 'ADMIN' };
    mocks.fetchUsers.mockResolvedValue([{ id: '1' }, { id: '2' }]);

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Total users');
    expect(wrapper.text()).toContain('2');
  });

  it('loads teacher subject and active exam counts', async () => {
    mocks.user.value = { fullName: 'Teacher', role: 'TEACHER' };
    mocks.fetchSubjects.mockResolvedValue([{ id: 's1' }]);
    mocks.fetchExams.mockResolvedValue([
      { id: 'e1', status: 'PUBLISHED' },
      { id: 'e2', status: 'DRAFT' },
    ]);

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Subjects');
    expect(wrapper.text()).toContain('Active exams');
  });

  it('loads student upcoming exams and recent scores', async () => {
    mocks.user.value = { fullName: 'Student', role: 'STUDENT' };
    mocks.fetchMyExams.mockResolvedValue([
      {
        assignmentId: 'a1',
        exam: {
          title: 'Midterm',
          status: 'PUBLISHED',
          closeAt: '2026-07-18T10:00:00.000Z',
        },
        bestScore: 8,
        attemptCount: 1,
      },
      {
        assignmentId: 'a2',
        exam: {
          title: 'Draft',
          status: 'DRAFT',
          closeAt: '2026-07-18T10:00:00.000Z',
        },
        bestScore: null,
        attemptCount: 0,
      },
    ]);

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.text()).toContain('Midterm');
    expect(wrapper.text()).toContain('Best score: 8');
    expect(wrapper.text()).not.toContain('Draft');
  });

  it('renders a load error', async () => {
    mocks.user.value = { fullName: 'Admin', role: 'ADMIN' };
    mocks.fetchUsers.mockRejectedValue(new Error('API unavailable'));

    const wrapper = mountDashboard();
    await flushPromises();

    expect(wrapper.get('.error').text()).toBe('API unavailable');
  });
});
