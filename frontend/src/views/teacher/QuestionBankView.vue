<template>
  <section>
    <header class="page-header">
      <p class="page-header__breadcrumb">
        <RouterLink to="/subjects">Subjects</RouterLink>
        <span aria-hidden="true"> / </span>
        <span>{{ subjectName || '…' }}</span>
      </p>
      <div class="page-header--row">
        <div>
          <h2 class="page-header__title">Question Bank</h2>
          <p class="page-header__subtitle">Filter and manage questions for this subject.</p>
        </div>
        <RouterLink
          class="btn btn--primary"
          :to="{ name: 'question-new', query: { subjectId } }"
        >
          Add Question
        </RouterLink>
      </div>
    </header>

    <div class="filter-bar">
      <label class="field">
        <span class="field__label">Search</span>
        <input
          v-model="search"
          class="field__input"
          placeholder="Search question text…"
          @input="debouncedLoad"
        />
      </label>
      <label class="field">
        <span class="field__label">Difficulty</span>
        <select v-model="difficulty" class="field__input" @change="load">
          <option value="">All</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </label>
    </div>

    <LoadingState v-if="loading" message="Loading questions…" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState
      v-else-if="!questions.length"
      title="No questions yet"
      description="Add questions to build your exam content."
      action-label="Add Question"
      @action="goToNew"
    />
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Question</th>
            <th>Difficulty</th>
            <th>Points</th>
            <th class="data-table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in questions" :key="q.id">
            <td class="data-table__truncate">{{ q.content }}</td>
            <td>{{ formatDifficulty(q.difficulty) }}</td>
            <td class="data-table__mono">{{ q.points }}</td>
            <td class="data-table__actions">
              <RouterLink class="btn btn--ghost btn--sm" :to="`/questions/${q.id}/edit`">
                Edit
              </RouterLink>
              <button
                type="button"
                class="btn btn--ghost btn--sm btn--danger-text"
                @click="confirmDelete(q.id)"
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
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LoadingState from '@/components/ui/LoadingState.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';
import { fetchQuestions, deleteQuestion } from '@/api/questions';
import { fetchSubjects } from '@/api/subjects';
import { getErrorMessage } from '@/api/client';
import { useToast } from '@/composables/useToast';
import type { Difficulty, Question } from '@/types/teacher';

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const subjectId = computed(() => route.params.id as string);
const subjectName = ref('');
const questions = ref<Question[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');
const difficulty = ref<Difficulty | ''>('');

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function formatDifficulty(d: Difficulty) {
  return d.charAt(0) + d.slice(1).toLowerCase();
}

function goToNew() {
  router.push({ name: 'question-new', query: { subjectId: subjectId.value } });
}

function debouncedLoad() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(load, 300);
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [subjectList, questionList] = await Promise.all([
      fetchSubjects(),
      fetchQuestions({
        subjectId: subjectId.value,
        difficulty: difficulty.value || undefined,
        q: search.value.trim() || undefined,
      }),
    ]);
    subjectName.value = subjectList.find((s) => s.id === subjectId.value)?.name ?? 'Subject';
    questions.value = questionList;
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function confirmDelete(id: string) {
  if (!window.confirm('Delete this question?')) return;
  try {
    await deleteQuestion(id);
    showToast('Question deleted.');
    await load();
  } catch (err) {
    window.alert(getErrorMessage(err));
  }
}

onMounted(load);
</script>
