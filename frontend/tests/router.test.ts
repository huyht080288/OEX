// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  initialized: false,
  isAuthenticated: false,
  user: null as null | { role: 'ADMIN' | 'TEACHER' | 'STUDENT' },
  initialize: vi.fn(async () => {
    auth.initialized = true;
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => auth,
}));

import router from '@/router';

describe('router authorization guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.initialized = false;
    auth.isAuthenticated = false;
    auth.user = null;
  });

  it('initializes auth and redirects anonymous users to login', async () => {
    await router.push('/exams');

    expect(auth.initialize).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/exams');
  });

  it('redirects authenticated users away from login', async () => {
    auth.initialized = true;
    auth.isAuthenticated = true;
    auth.user = { role: 'STUDENT' };

    await router.push('/');
    await router.push('/login');

    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('rejects a role mismatch and allows the correct role', async () => {
    auth.initialized = true;
    auth.isAuthenticated = true;
    auth.user = { role: 'STUDENT' };
    await router.push('/exams');
    expect(router.currentRoute.value.name).toBe('dashboard');

    auth.user = { role: 'TEACHER' };
    await router.push('/exams');
    expect(router.currentRoute.value.name).toBe('exams');
  });

  it('allows public routes for anonymous users', async () => {
    auth.initialized = true;
    await router.push('/login');

    expect(router.currentRoute.value.name).toBe('login');
  });
});
