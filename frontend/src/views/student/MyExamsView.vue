<template>
  <section>
    <header class="page-header">
      <h2 class="page-header__title">My Exams</h2>
      <p class="page-header__subtitle">Assigned exams you can start, resume, or review.</p>
    </header>

    <LoadingState v-if="loading" message="Loading exams…" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState
      v-else-if="!exams.length"
      title="No assigned exams"
      description="When a teacher assigns you an exam, it will appear here."
    />
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Exam Title</th>
            <th>Subject</th>
            <th>Opens</th>
            <th>Closes</th>
            <th>Duration</th>
            <th>Status</th>
            <th class="data-table__actions">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in exams" :key="item.assignmentId">
            <td>{{ item.exam.title }}</td>
            <td>{{ item.exam.subjectName ?? '—' }}</td>
            <td>{{ formatDateTime(item.exam.openAt) }}</td>
            <td>{{ formatDateTime(item.exam.closeAt) }}</td>
            <td class="data-table__mono">{{ item.exam.durationMinutes }} min</td>
            <td><StatusBadge :status="getStudentExamStatus(item)" /></td>
            <td class="data-table__actions">
              <button
                v-if="getStudentExamAction(item)"
                type="button"
                class="btn btn--primary btn--sm"
                :disabled="getStudentExamAction(item)?.disabled || actionLoading === item.assignmentId"
                @click="handleAction(item)"
              >
                {{
                  actionLoading === item.assignmentId
                    ? 'Please wait…'
                    : getStudentExamAction(item)?.label
                }}
              </button>
              <span v-else class="data-table__muted">—</span>
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
import { fetchMyExams } from '@/api/dashboard';
import { startAttempt } from '@/api/attempts';
import { getErrorMessage } from '@/api/client';
import { formatDateTime } from '@/utils/datetime';
import { getStudentExamAction, getStudentExamStatus } from '@/utils/studentExam';
import type { MyExamAssignment } from '@/types/dashboard';

const router = useRouter();

const exams = ref<MyExamAssignment[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const actionLoading = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    exams.value = await fetchMyExams();
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function handleAction(item: MyExamAssignment) {
  const action = getStudentExamAction(item);
  if (!action || action.disabled) return;

  if (action.label === 'View Result' && action.attemptId) {
    router.push(`/results/${action.attemptId}`);
    return;
  }

  if (action.label === 'Resume' && action.attemptId) {
    router.push(`/take/${action.attemptId}`);
    return;
  }

  if (action.label === 'Start' && action.assignmentId) {
    actionLoading.value = item.assignmentId;
    try {
      const attempt = await startAttempt(action.assignmentId);
      router.push(`/take/${attempt.attemptId}`);
    } catch (err) {
      window.alert(getErrorMessage(err));
      await load();
    } finally {
      actionLoading.value = null;
    }
  }
}

onMounted(load);
</script>
