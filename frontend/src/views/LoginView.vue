<template>
  <div class="login-page">
    <aside class="login-page__brand" aria-hidden="true">
      <div class="login-page__brand-inner">
        <div class="login-page__brand-mark">
          <OexMark />
        </div>
        <h1 class="login-page__brand-title">OEX</h1>
        <p class="login-page__brand-text">
          A focused examination platform for teachers, students, and administrators — built for
          clarity under deadline.
        </p>
        <ul class="login-page__features">
          <li><span class="login-page__feature-dot" />Secure timed assessments</li>
          <li><span class="login-page__feature-dot" />Question banks and instant grading</li>
          <li><span class="login-page__feature-dot" />Role-based dashboards</li>
        </ul>
      </div>
    </aside>

    <div class="login-page__panel">
      <div class="login-card">
        <div class="login-card__header">
          <span class="login-card__mark" aria-hidden="true">
            <OexMark />
          </span>
          <h2 class="login-card__title">Sign in to OEX</h2>
          <p class="login-card__subtitle">Enter your credentials to continue</p>
        </div>

        <form class="login-form" @submit.prevent="handleSubmit">
          <div class="field">
            <label class="field__label" for="email">Email address</label>
            <input
              id="email"
              v-model="email"
              type="email"
              class="field__input"
              placeholder="Email address"
              autocomplete="email"
              required
            />
          </div>

          <div class="field">
            <label class="field__label" for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="field__input"
              placeholder="Password"
              autocomplete="current-password"
              required
            />
          </div>

          <p v-if="errorMessage" class="login-form__error" role="alert">{{ errorMessage }}</p>

          <button type="submit" class="btn btn--primary btn--block" :disabled="auth.loading">
            {{ auth.loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { getErrorCode, getErrorMessage } from '@/api/client';
import OexMark from '@/components/ui/OexMark.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const errorMessage = ref('');

async function handleSubmit() {
  errorMessage.value = '';
  try {
    await auth.login({ email: email.value, password: password.value });
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.push(redirect);
  } catch (err) {
    const code = getErrorCode(err);
    if (code === 'INVALID_CREDENTIALS') {
      errorMessage.value = 'Invalid email or password.';
    } else if (code === 'ACCOUNT_INACTIVE') {
      errorMessage.value =
        'Your account has been deactivated. Contact an administrator.';
    } else {
      errorMessage.value = getErrorMessage(err, 'Could not sign in. Try again.');
    }
  }
}
</script>
