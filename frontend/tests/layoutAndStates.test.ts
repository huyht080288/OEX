// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as null | {
      id: string;
      fullName: string;
      email: string;
      role: 'ADMIN' | 'TEACHER' | 'STUDENT';
    },
    logout: vi.fn(),
  },
  route: {
    meta: {} as Record<string, unknown>,
  },
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mocks.auth,
}));

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual,
    useRoute: () => mocks.route,
  };
});

import AppLayout from '@/components/layout/AppLayout.vue';
import LoadingState from '@/components/ui/LoadingState.vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import { useToast } from '@/composables/useToast';
import NotFoundView from '@/views/NotFoundView.vue';
import PlaceholderView from '@/views/PlaceholderView.vue';

const routerStubs = {
  RouterLink: { template: '<a><slot /></a>' },
  RouterView: { template: '<div>Current page</div>' },
};

describe('AppLayout', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['ADMIN', 'Administrator'],
    ['TEACHER', 'Teacher'],
    ['STUDENT', 'Student'],
  ] as const)('renders the %s identity and signs out', async (role, label) => {
    mocks.auth.user = {
      id: 'u1',
      fullName: 'Test User',
      email: 'user@oex.test',
      role,
    };
    const wrapper = mount(AppLayout, { global: { stubs: routerStubs } });

    expect(wrapper.text()).toContain('Test User');
    expect(wrapper.text()).toContain(label);
    await wrapper.get('button').trigger('click');
    expect(mocks.auth.logout).toHaveBeenCalledOnce();
  });

  it('hides navigation when no user exists', () => {
    mocks.auth.user = null;
    const wrapper = mount(AppLayout, { global: { stubs: routerStubs } });

    expect(wrapper.find('aside').exists()).toBe(false);
  });
});

describe('simple state views', () => {
  it('renders default and custom loading messages', async () => {
    const wrapper = mount(LoadingState);
    expect(wrapper.text()).toBe('Loading…');

    await wrapper.setProps({ message: 'Loading exams…' });
    expect(wrapper.text()).toBe('Loading exams…');
  });

  it('renders the shared toast message', async () => {
    const wrapper = mount(ToastContainer);
    useToast().showToast('Changes saved');
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[role="status"]').text()).toBe('Changes saved');
  });

  it('renders not found content', () => {
    const wrapper = mount(NotFoundView, { global: { stubs: routerStubs } });
    expect(wrapper.text()).toContain('Page not found');
    expect(wrapper.text()).toContain('Go to dashboard');
  });

  it('reads placeholder text from route metadata and provides defaults', async () => {
    mocks.route.meta = {
      placeholderTitle: 'Reports',
      placeholderDescription: 'Reports are being prepared.',
    };
    const custom = mount(PlaceholderView, { global: { stubs: routerStubs } });
    expect(custom.text()).toContain('Reports are being prepared.');

    mocks.route.meta = {};
    const fallback = mount(PlaceholderView, { global: { stubs: routerStubs } });
    expect(fallback.text()).toContain('Coming soon');
  });
});
