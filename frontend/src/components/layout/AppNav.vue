<template>
  <aside class="nav" aria-label="Main navigation">
    <nav>
      <ul class="nav__list">
        <li>
          <RouterLink
            class="nav__link"
            :to="{ name: 'dashboard' }"
            active-class="nav__link--active"
          >
            <span class="nav__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z" />
              </svg>
            </span>
            Dashboard
          </RouterLink>
        </li>
        <template v-if="role === 'ADMIN'">
          <li>
            <RouterLink class="nav__link" to="/admin/users" active-class="nav__link--active">
              <span class="nav__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              User Management
            </RouterLink>
          </li>
        </template>
        <template v-if="role === 'TEACHER'">
          <li>
            <RouterLink class="nav__link" to="/subjects" active-class="nav__link--active">
              <span class="nav__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                </svg>
              </span>
              Subjects
            </RouterLink>
          </li>
          <li>
            <RouterLink class="nav__link" to="/exams" active-class="nav__link--active">
              <span class="nav__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </span>
              Exams
            </RouterLink>
          </li>
        </template>
        <template v-if="role === 'STUDENT'">
          <li>
            <RouterLink class="nav__link" to="/my-exams" active-class="nav__link--active">
              <span class="nav__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </span>
              My Exams
            </RouterLink>
          </li>
        </template>
      </ul>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import type { Role } from '@/types/api';

defineProps<{ role: Role }>();
</script>
