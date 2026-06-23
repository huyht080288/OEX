<template>
  <section>
    <header class="page-header">
      <p class="page-header__breadcrumb">
        <RouterLink to="/subjects">Subjects</RouterLink>
        <span aria-hidden="true"> / </span>
        <span>{{ isEdit ? 'Edit Question' : 'New Question' }}</span>
      </p>
      <h2 class="page-header__title">{{ isEdit ? 'Edit Question' : 'Create Question' }}</h2>
    </header>

    <LoadingState v-if="initialLoading" message="Loading question…" />
    <form v-else class="form-card" @submit.prevent="save">
      <div class="form-grid">
        <label class="field form-grid--full">
          <span class="field__label">Subject</span>
          <select v-model="form.subjectId" class="field__input" required :disabled="isEdit">
            <option value="" disabled>Select subject</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
        <label class="field form-grid--full">
          <span class="field__label">Question text</span>
          <textarea v-model="form.content" class="field__input" rows="4" required />
        </label>
        <label class="field">
          <span class="field__label">Difficulty</span>
          <select v-model="form.difficulty" class="field__input" required>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Points</span>
          <input
            v-model.number="form.points"
            class="field__input"
            type="number"
            min="0.5"
            step="0.5"
            required
          />
        </label>
      </div>

      <fieldset class="options-fieldset">
        <legend class="field__label">Answer options</legend>
        <p class="options-hint">Select exactly one correct answer.</p>
        <div v-for="(opt, index) in form.options" :key="index" class="option-row">
          <span class="option-row__label">{{ opt.label }}</span>
          <input
            v-model="opt.content"
            class="field__input"
            :placeholder="`Option ${opt.label}`"
            required
          />
          <label class="option-row__correct">
            <input
              v-model="correctIndex"
              type="radio"
              name="correct"
              :value="index"
            />
            Correct
          </label>
          <button
            v-if="form.options.length > 2"
            type="button"
            class="btn btn--ghost btn--sm"
            aria-label="Remove option"
            @click="removeOption(index)"
          >
            Remove
          </button>
        </div>
        <button
          v-if="form.options.length < 6"
          type="button"
          class="btn btn--secondary"
          @click="addOption"
        >
          Add option
        </button>
      </fieldset>

      <p v-if="formError" class="form-error">{{ formError }}</p>

      <div class="form-actions">
        <button type="button" class="btn btn--secondary" @click="cancel">Cancel</button>
        <button type="submit" class="btn btn--primary" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save Question' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LoadingState from '@/components/ui/LoadingState.vue';
import { fetchSubjects } from '@/api/subjects';
import { createQuestion, fetchQuestion, updateQuestion } from '@/api/questions';
import { getErrorMessage } from '@/api/client';
import { useToast } from '@/composables/useToast';
import type { Subject } from '@/types/teacher';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const isEdit = computed(() => route.name === 'question-edit');
const questionId = computed(() => route.params.id as string | undefined);

const subjects = ref<Subject[]>([]);
const initialLoading = ref(true);
const saving = ref(false);
const formError = ref<string | null>(null);
const correctIndex = ref(0);

const form = reactive({
  subjectId: (route.query.subjectId as string) || '',
  content: '',
  difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
  points: 1,
  options: [
    { label: 'A', content: '', isCorrect: true },
    { label: 'B', content: '', isCorrect: false },
  ],
});

watch(correctIndex, (idx) => {
  form.options.forEach((o, i) => {
    o.isCorrect = i === idx;
  });
});

function addOption() {
  const label = OPTION_LABELS[form.options.length];
  if (!label) return;
  form.options.push({ label, content: '', isCorrect: false });
}

function removeOption(index: number) {
  form.options.splice(index, 1);
  form.options.forEach((o, i) => {
    o.label = OPTION_LABELS[i];
  });
  if (correctIndex.value >= form.options.length) {
    correctIndex.value = 0;
  }
}

function cancel() {
  if (form.subjectId) {
    router.push(`/subjects/${form.subjectId}/questions`);
  } else {
    router.push('/subjects');
  }
}

async function loadInitial() {
  initialLoading.value = true;
  try {
    subjects.value = await fetchSubjects();
    if (isEdit.value && questionId.value) {
      const q = await fetchQuestion(questionId.value);
      form.subjectId = q.subjectId;
      form.content = q.content;
      form.difficulty = q.difficulty;
      form.points = q.points;
      form.options = q.options.map((o) => ({
        label: o.label,
        content: o.content,
        isCorrect: o.isCorrect,
      }));
      correctIndex.value = Math.max(0, form.options.findIndex((o) => o.isCorrect));
    }
  } catch (err) {
    formError.value = getErrorMessage(err);
  } finally {
    initialLoading.value = false;
  }
}

async function save() {
  formError.value = null;
  const correctCount = form.options.filter((o) => o.isCorrect).length;
  if (correctCount !== 1) {
    formError.value = 'Select exactly one correct answer.';
    return;
  }

  saving.value = true;
  try {
    const payload = {
      subjectId: form.subjectId,
      content: form.content.trim(),
      difficulty: form.difficulty,
      points: form.points,
      options: form.options.map((o) => ({
        label: o.label,
        content: o.content.trim(),
        isCorrect: o.isCorrect,
      })),
    };
    if (isEdit.value && questionId.value) {
      await updateQuestion(questionId.value, payload);
    } else {
      await createQuestion(payload);
    }
    showToast('Question saved.');
    router.push(`/subjects/${form.subjectId}/questions`);
  } catch (err) {
    formError.value = getErrorMessage(err);
  } finally {
    saving.value = false;
  }
}

onMounted(loadInitial);
</script>
