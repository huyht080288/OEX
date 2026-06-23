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
            Dashboard
          </RouterLink>
        </li>
        <template v-if="role === 'ADMIN'">
          <li>
            <RouterLink class="nav__link" to="/admin/users" active-class="nav__link--active">
              User Management
            </RouterLink>
          </li>
        </template>
        <template v-if="role === 'TEACHER'">
          <li>
            <RouterLink class="nav__link" to="/subjects" active-class="nav__link--active">
              Subjects
            </RouterLink>
          </li>
          <li>
            <RouterLink class="nav__link" to="/exams" active-class="nav__link--active">
              Exams
            </RouterLink>
          </li>
        </template>
        <template v-if="role === 'STUDENT'">
          <li>
            <RouterLink class="nav__link" to="/my-exams" active-class="nav__link--active">
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
