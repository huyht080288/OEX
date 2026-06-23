<template>
  <section>
    <header class="page-header">
      <p class="page-header__breadcrumb">
        <RouterLink to="/exams">Exams</RouterLink>
        <span aria-hidden="true"> / </span>
        <span>New Exam</span>
      </p>
      <h2 class="page-header__title">Create Exam</h2>
    </header>

    <form class="form-card" @submit.prevent="save">
      <div class="form-grid">
        <label class="field form-grid--full">
          <span class="field__label">Title</span>
          <input v-model="form.title" class="field__input" required maxlength="255" />
        </label>
        <label class="field">
          <span class="field__label">Subject</span>
          <select v-model="form.subjectId" class="field__input" required>
            <option value="" disabled>Select subject</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Duration (minutes)</span>
          <input
            v-model.number="form.durationMinutes"
            class="field__input"
            type="number"
            min="1"
            required
          />
        </label>
        <label class="field form-grid--full">
          <span class="field__label">Description</span>
          <textarea v-model="form.description" class="field__input" rows="3" />
        </label>
        <label class="field">
          <span class="field__label">Open date/time</span>
          <input v-model="form.openAt" class="field__input" type="datetime-local" required />
        </label>
        <label class="field">
          <span class="field__label">Close date/time</span>
          <input v-model="form.closeAt" class="field__input" type="datetime-local" required />
        </label>
        <label class="field">
          <span class="field__label">Max attempts</span>
          <input
            v-model.number="form.maxAttempts"
            class="field__input"
            type="number"
            min="1"
            required
          />
        </label>
        <label class="field field--checkbox">
          <input v-model="form.showAnswersAfterSubmit" type="checkbox" />
          <span class="field__label">Show answers after submit</span>
        </label>
      </div>

      <p v-if="formError" class="form-error">{{ formError }}</p>

      <div class="form-actions">
        <RouterLink class="btn btn--secondary" to="/exams">Cancel</RouterLink>
        <button type="submit" class="btn btn--primary" :disabled="saving">
          {{ saving ? 'Creating…' : 'Create Exam' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchSubjects } from '@/api/subjects';
import { createExam } from '@/api/exams';
import { getErrorMessage } from '@/api/client';
import { datetimeLocalToIso } from '@/utils/datetime';
import { useToast } from '@/composables/useToast';
import type { Subject } from '@/types/teacher';

const router = useRouter();
const { showToast } = useToast();

const subjects = ref<Subject[]>([]);
const saving = ref(false);
const formError = ref<string | null>(null);

const defaultOpen = new Date();
defaultOpen.setHours(defaultOpen.getHours() + 1, 0, 0, 0);
const defaultClose = new Date(defaultOpen);
defaultClose.setDate(defaultClose.getDate() + 7);

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const form = reactive({
  title: '',
  subjectId: '',
  description: '',
  durationMinutes: 60,
  openAt: toLocalInput(defaultOpen),
  closeAt: toLocalInput(defaultClose),
  maxAttempts: 1,
  showAnswersAfterSubmit: false,
});

onMounted(async () => {
  subjects.value = await fetchSubjects();
  if (subjects.value.length) {
    form.subjectId = subjects.value[0].id;
  }
});

async function save() {
  saving.value = true;
  formError.value = null;
  try {
    const exam = await createExam({
      subjectId: form.subjectId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      durationMinutes: form.durationMinutes,
      openAt: datetimeLocalToIso(form.openAt),
      closeAt: datetimeLocalToIso(form.closeAt),
      maxAttempts: form.maxAttempts,
      showAnswersAfterSubmit: form.showAnswersAfterSubmit,
    });
    showToast('Exam created.');
    router.push(`/exams/${exam.id}`);
  } catch (err) {
    formError.value = getErrorMessage(err);
  } finally {
    saving.value = false;
  }
}
</script>
