import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import * as authApi from '@/api/auth';
import { getStoredToken, setStoredToken, setUnauthorizedHandler } from '@/api/client';
import type { AuthUser, LoginPayload } from '@/types/auth';
import router from '@/router';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const token = ref<string | null>(getStoredToken());
  const initialized = ref(false);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  async function initialize() {
    if (initialized.value) return;
    setUnauthorizedHandler(() => {
      user.value = null;
      token.value = null;
      if (router.currentRoute.value.meta.public !== true) {
        router.push({ name: 'login' });
      }
    });

    if (!token.value) {
      initialized.value = true;
      return;
    }

    try {
      user.value = await authApi.fetchMe();
    } catch {
      setStoredToken(null);
      token.value = null;
      user.value = null;
    } finally {
      initialized.value = true;
    }
  }

  async function login(payload: LoginPayload) {
    loading.value = true;
    try {
      const result = await authApi.login(payload);
      token.value = result.accessToken;
      setStoredToken(result.accessToken);
      user.value = result.user;
      return result;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    setStoredToken(null);
    router.push({ name: 'login' });
  }

  return {
    user,
    token,
    initialized,
    loading,
    isAuthenticated,
    initialize,
    login,
    logout,
  };
});
