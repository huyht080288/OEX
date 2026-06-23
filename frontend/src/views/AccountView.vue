<template>
  <section>
    <header class="page-header">
      <h2 class="page-header__title">Account</h2>
      <p class="page-header__subtitle">Update your password.</p>
    </header>

    <form class="account-form" @submit.prevent="submit">
      <label class="field">
        <span class="field__label">Current password</span>
        <input
          v-model="currentPassword"
          class="field__input"
          type="password"
          required
          autocomplete="current-password"
        />
      </label>
      <label class="field">
        <span class="field__label">New password</span>
        <input
          v-model="newPassword"
          class="field__input"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
        />
      </label>
      <label class="field">
        <span class="field__label">Confirm new password</span>
        <input
          v-model="confirmPassword"
          class="field__input"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
        />
      </label>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <p v-if="success" class="form-success">Password updated successfully.</p>
      <div class="form-actions">
        <button type="submit" class="btn btn--primary" :disabled="saving">
          {{ saving ? 'Updating…' : 'Change Password' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { changePassword } from '@/api/auth';
import { getErrorMessage } from '@/api/client';

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const saving = ref(false);
const formError = ref<string | null>(null);
const success = ref(false);

async function submit() {
  formError.value = null;
  success.value = false;

  if (newPassword.value !== confirmPassword.value) {
    formError.value = 'New passwords do not match.';
    return;
  }

  saving.value = true;
  try {
    await changePassword(currentPassword.value, newPassword.value);
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    success.value = true;
  } catch (err) {
    formError.value = getErrorMessage(err);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.account-form {
  max-width: 28rem;
  display: grid;
  gap: 1rem;
}

.form-success {
  color: var(--color-success, #15803d);
  margin: 0;
}
</style>
