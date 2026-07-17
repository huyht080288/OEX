// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  auth: {
    loading: false,
    login: vi.fn(),
  },
  push: vi.fn(),
  route: { query: {} as Record<string, unknown> },
  changePassword: vi.fn(),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mocks.auth,
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
  useRoute: () => mocks.route,
}));

vi.mock('@/api/auth', () => ({
  changePassword: mocks.changePassword,
}));

import AccountView from '@/views/AccountView.vue';
import LoginView from '@/views/LoginView.vue';

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.loading = false;
    mocks.route.query = {};
  });

  async function submit(wrapper: ReturnType<typeof mount>) {
    await wrapper.get('#email').setValue('student@oex.test');
    await wrapper.get('#password').setValue('Password123!');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
  }

  it('logs in and honors the redirect query', async () => {
    mocks.auth.login.mockResolvedValue({});
    mocks.route.query = { redirect: '/my-exams' };
    const wrapper = mount(LoginView);

    await submit(wrapper);

    expect(mocks.auth.login).toHaveBeenCalledWith({
      email: 'student@oex.test',
      password: 'Password123!',
    });
    expect(mocks.push).toHaveBeenCalledWith('/my-exams');
  });

  it.each([
    ['INVALID_CREDENTIALS', 'Invalid email or password.'],
    ['ACCOUNT_INACTIVE', 'Your account has been deactivated. Contact an administrator.'],
    ['OTHER', 'Server unavailable'],
  ])('shows a useful %s error', async (code, expected) => {
    mocks.auth.login.mockRejectedValue(
      Object.assign(new Error(code === 'OTHER' ? 'Server unavailable' : 'Failed'), { code }),
    );
    const wrapper = mount(LoginView);

    await submit(wrapper);

    expect(wrapper.get('[role="alert"]').text()).toBe(expected);
  });
});

describe('AccountView', () => {
  beforeEach(() => vi.clearAllMocks());

  async function fillPasswords(
    wrapper: ReturnType<typeof mount>,
    current: string,
    next: string,
    confirm: string,
  ) {
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue(current);
    await inputs[1].setValue(next);
    await inputs[2].setValue(confirm);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
  }

  it('rejects mismatched new passwords', async () => {
    const wrapper = mount(AccountView);

    await fillPasswords(wrapper, 'old-password', 'new-password', 'different-password');

    expect(wrapper.text()).toContain('New passwords do not match.');
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it('changes the password and clears the form', async () => {
    mocks.changePassword.mockResolvedValue(undefined);
    const wrapper = mount(AccountView);

    await fillPasswords(wrapper, 'old-password', 'new-password', 'new-password');

    expect(mocks.changePassword).toHaveBeenCalledWith('old-password', 'new-password');
    expect(wrapper.text()).toContain('Password updated successfully.');
    expect(wrapper.findAll('input').every((input) => input.element.value === '')).toBe(true);
  });

  it('shows an API error', async () => {
    mocks.changePassword.mockRejectedValue(new Error('Current password is incorrect'));
    const wrapper = mount(AccountView);

    await fillPasswords(wrapper, 'wrong-password', 'new-password', 'new-password');

    expect(wrapper.text()).toContain('Current password is incorrect');
  });
});
