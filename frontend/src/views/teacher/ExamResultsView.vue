<template>
  <section>
    <header class="page-header">
      <p class="page-header__breadcrumb">
        <RouterLink to="/exams">Exams</RouterLink>
        <span aria-hidden="true"> / </span>
        <RouterLink :to="`/exams/${examId}`">{{ examTitle || 'Exam' }}</RouterLink>
        <span aria-hidden="true"> / </span>
        <span>Results</span>
      </p>
      <h2 class="page-header__title">Exam Results</h2>
      <p v-if="examTitle" class="page-header__subtitle">{{ examTitle }}</p>
    </header>

    <LoadingState v-if="loading" message="Loading results…" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState
      v-else-if="!results.length"
      title="No attempts yet"
      description="Results will appear when students submit their exams."
    />
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Email</th>
            <th>Score</th>
            <th>Max Score</th>
            <th>Submitted At</th>
            <th>Status</th>
            <th class="data-table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in results" :key="row.attemptId">
            <td>{{ row.studentName }}</td>
            <td>{{ row.studentEmail }}</td>
            <td class="data-table__mono">{{ row.score ?? '—' }}</td>
            <td class="data-table__mono">{{ row.maxScore }}</td>
            <td>{{ row.submittedAt ? formatDateTime(row.submittedAt) : '—' }}</td>
            <td><StatusBadge :status="row.status" /></td>
            <td class="data-table__actions">
              <RouterLink
                v-if="row.status === 'SUBMITTED' || row.status === 'EXPIRED'"
                class="btn btn--ghost btn--sm"
                :to="`/exams/${examId}/attempts/${row.attemptId}`"
              >
                View Detail
              </RouterLink>
              <span v-else class="data-table__muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import LoadingState from '@/components/ui/LoadingState.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { fetchExam, fetchExamResults } from '@/api/exams';
import { getErrorMessage } from '@/api/client';
import { formatDateTime } from '@/utils/datetime';
import type { ExamResultRow } from '@/types/teacher';

const route = useRoute();
const examId = computed(() => route.params.id as string);

const examTitle = ref('');
const results = ref<ExamResultRow[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [exam, rows] = await Promise.all([
      fetchExam(examId.value),
      fetchExamResults(examId.value),
    ]);
    examTitle.value = exam.title;
    results.value = rows;
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
