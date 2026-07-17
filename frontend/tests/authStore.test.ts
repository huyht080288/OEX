// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  fetchMe: vi.fn(),
  getStoredToken: vi.fn(),
  setStoredToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
  routerPush: vi.fn(),
  currentRoute: { value: { meta: {} as Record<string, unknown> } },
}));

vi.mock('@/api/auth', () => ({
  login: mocks.login,
  fetchMe: mocks.fetchMe,
}));

vi.mock('@/api/client', () => ({
  getStoredToken: mocks.getStoredToken,
  setStoredToken: mocks.setStoredToken,
  setUnauthorizedHandler: mocks.setUnauthorizedHandler,
}));

vi.mock('@/router', () => ({
  default: {
    currentRoute: mocks.currentRoute,
    push: mocks.routerPush,
  },
}));

import { useAuthStore } from '@/stores/auth';

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStoredToken.mockReturnValue(null);
    mocks.currentRoute.value = { meta: {} };
    setActivePinia(createPinia());
  });

  it('initializes without requesting a profile when no token exists', async () => {
    const store = useAuthStore();

    await store.initialize();
    await store.initialize();

    expect(store.initialized).toBe(true);
    expect(mocks.fetchMe).not.toHaveBeenCalled();
    expect(mocks.setUnauthorizedHandler).toHaveBeenCalledOnce();
  });

  it('loads the current user when a token exists', async () => {
    mocks.getStoredToken.mockReturnValue('saved-token');
    mocks.fetchMe.mockResolvedValue({
      id: 'u1',
      email: 'teacher@oex.test',
      fullName: 'Teacher',
      role: 'TEACHER',
      isActive: true,
    });
    const store = useAuthStore();

    await store.initialize();

    expect(store.user?.role).toBe('TEACHER');
    expect(store.isAuthenticated).toBe(true);
  });

  it('clears an invalid saved token', async () => {
    mocks.getStoredToken.mockReturnValue('invalid');
    mocks.fetchMe.mockRejectedValue(new Error('Unauthorized'));
    const store = useAuthStore();

    await store.initialize();

    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(mocks.setStoredToken).toHaveBeenCalledWith(null);
  });

  it('logs in and always clears the loading state', async () => {
    const result = {
      accessToken: 'new-token',
      expiresIn: 3600,
      user: {
        id: 'u1',
        email: 'student@oex.test',
        fullName: 'Student',
        role: 'STUDENT',
        isActive: true,
      },
    };
    mocks.login.mockResolvedValue(result);
    const store = useAuthStore();

    await expect(
      store.login({ email: 'student@oex.test', password: 'Password123!' }),
    ).resolves.toBe(result);

    expect(store.token).toBe('new-token');
    expect(store.user).toEqual(result.user);
    expect(store.loading).toBe(false);
    expect(mocks.setStoredToken).toHaveBeenCalledWith('new-token');
  });

  it('logs out and redirects to login', () => {
    const store = useAuthStore();

    store.logout();

    expect(store.user).toBeNull();
    expect(store.token).toBeNull();
    expect(mocks.setStoredToken).toHaveBeenCalledWith(null);
    expect(mocks.routerPush).toHaveBeenCalledWith({ name: 'login' });
  });

  it('handles a later unauthorized response and respects public routes', async () => {
    const store = useAuthStore();
    await store.initialize();
    const handler = mocks.setUnauthorizedHandler.mock.calls[0][0];

    handler();
    expect(mocks.routerPush).toHaveBeenCalledWith({ name: 'login' });

    mocks.routerPush.mockClear();
    mocks.currentRoute.value = { meta: { public: true } };
    handler();
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });
});
