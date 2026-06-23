<template>
  <section class="dashboard">
    <header class="page-header">
      <h2 class="page-header__title">Dashboard</h2>
      <p class="page-header__subtitle">Welcome back, {{ auth.user?.fullName }}.</p>
    </header>

    <LoadingState v-if="loading" message="Loading dashboard…" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState
      v-else-if="!stats"
      title="No dashboard data"
      description="We could not build your dashboard summary."
    />
    <div v-else class="dashboard__grid">
      <template v-if="stats.role === 'ADMIN'">
        <article class="stat-card">
          <p class="stat-card__label">Total users</p>
          <p class="stat-card__value">{{ stats.totalUsers ?? 0 }}</p>
          <RouterLink class="stat-card__link" to="/admin/users">Manage users</RouterLink>
        </article>
      </template>

      <template v-if="stats.role === 'TEACHER'">
        <article class="stat-card">
          <p class="stat-card__label">Subjects</p>
          <p class="stat-card__value">{{ stats.subjectCount ?? 0 }}</p>
          <RouterLink class="stat-card__link" to="/subjects">View subjects</RouterLink>
        </article>
        <article class="stat-card">
          <p class="stat-card__label">Active exams</p>
          <p class="stat-card__value">{{ stats.activeExamCount ?? 0 }}</p>
          <RouterLink class="stat-card__link" to="/exams">View exams</RouterLink>
        </article>
      </template>

      <template v-if="stats.role === 'STUDENT'">
        <article class="stat-card stat-card--wide">
          <p class="stat-card__label">Upcoming exams</p>
          <ul v-if="stats.upcomingExams?.length" class="dashboard-list">
            <li v-for="item in stats.upcomingExams" :key="item.assignmentId">
              <span class="dashboard-list__title">{{ item.exam.title }}</span>
              <span class="dashboard-list__meta">
                Closes {{ formatDate(item.exam.closeAt) }}
              </span>
            </li>
          </ul>
          <p v-else class="stat-card__empty">No assigned exams right now.</p>
          <RouterLink class="stat-card__link" to="/my-exams">Go to My Exams</RouterLink>
        </article>
        <article v-if="stats.recentScores?.length" class="stat-card stat-card--wide">
          <p class="stat-card__label">Recent scores</p>
          <ul class="dashboard-list">
            <li v-for="(score, index) in stats.recentScores" :key="index">
              <span class="dashboard-list__title">{{ score.title }}</span>
              <span class="dashboard-list__score">Best score: {{ score.score }}</span>
            </li>
          </ul>
        </article>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { getErrorMessage } from '@/api/client';
import * as dashboardApi from '@/api/dashboard';
import type { DashboardStats } from '@/types/dashboard';
import LoadingState from '@/components/ui/LoadingState.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';

const auth = useAuthStore();
const stats = ref<DashboardStats | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

async function load() {
  if (!auth.user) return;
  loading.value = true;
  error.value = null;
  try {
    if (auth.user.role === 'ADMIN') {
      const users = await dashboardApi.fetchUsers();
      stats.value = { role: 'ADMIN', totalUsers: users.length };
    } else if (auth.user.role === 'TEACHER') {
      const [subjects, exams] = await Promise.all([
        dashboardApi.fetchSubjects(),
        dashboardApi.fetchExams(),
      ]);
      stats.value = {
        role: 'TEACHER',
        subjectCount: subjects.length,
        activeExamCount: exams.filter((e) => e.status === 'PUBLISHED').length,
      };
    } else {
      const myExams = await dashboardApi.fetchMyExams();
      const upcoming = myExams.filter((a) => a.exam.status === 'PUBLISHED');
      const recentScores = myExams
        .filter((a) => a.bestScore !== null && a.attemptCount > 0)
        .slice(0, 3)
        .map((a) => ({
          title: a.exam.title,
          score: a.bestScore ?? 0,
        }));
      stats.value = {
        role: 'STUDENT',
        upcomingExams: upcoming.slice(0, 5),
        recentScores,
      };
    }
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load dashboard. Try again.');
    stats.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
