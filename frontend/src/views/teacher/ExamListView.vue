<template>
  <section>
    <header class="page-header page-header--row">
      <div>
        <h2 class="page-header__title">Exams</h2>
        <p class="page-header__subtitle">Create, publish, and manage your exams.</p>
      </div>
      <RouterLink class="btn btn--primary" to="/exams/new">Create Exam</RouterLink>
    </header>

    <LoadingState v-if="loading" message="Loading exams…" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState
      v-else-if="!exams.length"
      title="No exams yet"
      description="Create your first exam to assign it to students."
      action-label="Create Exam"
      @action="router.push('/exams/new')"
    />
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Opens</th>
            <th>Closes</th>
            <th class="data-table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="exam in exams" :key="exam.id">
            <td>{{ exam.title }}</td>
            <td>{{ subjectName(exam.subjectId) }}</td>
            <td><StatusBadge :status="exam.status" /></td>
            <td>{{ formatDateTime(exam.openAt) }}</td>
            <td>{{ formatDateTime(exam.closeAt) }}</td>
            <td class="data-table__actions">
              <RouterLink class="btn btn--ghost btn--sm" :to="`/exams/${exam.id}`">
                View
              </RouterLink>
              <RouterLink class="btn btn--ghost btn--sm" :to="`/exams/${exam.id}/results`">
                Results
              </RouterLink>
              <button
                v-if="exam.status === 'DRAFT'"
                type="button"
                class="btn btn--ghost btn--sm btn--danger-text"
                @click="confirmDelete(exam.id, exam.title)"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import LoadingState from '@/components/ui/LoadingState.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { fetchExams, deleteExam } from '@/api/exams';
import { fetchSubjects } from '@/api/subjects';
import { getErrorMessage } from '@/api/client';
import { formatDateTime } from '@/utils/datetime';
import { useToast } from '@/composables/useToast';
import type { Exam, Subject } from '@/types/teacher';

const router = useRouter();
const { showToast } = useToast();

const exams = ref<Exam[]>([]);
const subjects = ref<Subject[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

function subjectName(id: string) {
  return subjects.value.find((s) => s.id === id)?.name ?? '—';
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    [exams.value, subjects.value] = await Promise.all([fetchExams(), fetchSubjects()]);
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function confirmDelete(id: string, title: string) {
  if (!window.confirm(`Delete draft exam "${title}"?`)) return;
  try {
    await deleteExam(id);
    showToast('Exam deleted.');
    await load();
  } catch (err) {
    window.alert(getErrorMessage(err));
  }
}

onMounted(load);
</script>
