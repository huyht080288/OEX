<template>
  <div class="layout">
    <header class="layout__header">
      <div class="layout__brand">
        <span class="layout__mark" aria-hidden="true" />
        <div>
          <p class="layout__eyebrow">Online Examination System</p>
          <h1 class="layout__title">OEX</h1>
        </div>
      </div>
      <div class="layout__user">
        <div class="layout__user-meta">
          <span class="layout__name">{{ user?.fullName }}</span>
          <span class="layout__role">{{ roleLabel }}</span>
        </div>
        <RouterLink class="btn btn--ghost" to="/account">Account</RouterLink>
        <button type="button" class="btn btn--ghost" @click="auth.logout()">Sign out</button>
      </div>
    </header>
    <div class="layout__body">
      <AppNav v-if="user" :role="user.role" />
      <main class="layout__main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import AppNav from './AppNav.vue';

const auth = useAuthStore();
const user = computed(() => auth.user);

const roleLabel = computed(() => {
  switch (user.value?.role) {
    case 'ADMIN':
      return 'Administrator';
    case 'TEACHER':
      return 'Teacher';
    case 'STUDENT':
      return 'Student';
    default:
      return '';
  }
});
</script>
