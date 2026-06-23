<template>
  <section>
    <header class="page-header page-header--row">
      <div>
        <h2 class="page-header__title">Subjects</h2>
        <p class="page-header__subtitle">Manage your subject catalog.</p>
      </div>
      <button type="button" class="btn btn--primary" @click="openCreate">Add Subject</button>
    </header>

    <LoadingState v-if="loading" message="Loading subjects…" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState
      v-else-if="!subjects.length"
      title="No subjects yet"
      description="Create your first subject to start building a question bank."
      action-label="Add Subject"
      @action="openCreate"
    />
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Description</th>
            <th class="data-table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="subject in subjects" :key="subject.id">
            <td class="data-table__mono">{{ subject.code }}</td>
            <td>{{ subject.name }}</td>
            <td class="data-table__truncate">{{ subject.description || '—' }}</td>
            <td class="data-table__actions">
              <RouterLink class="btn btn--ghost btn--sm" :to="`/subjects/${subject.id}/questions`">
                Questions
              </RouterLink>
              <button type="button" class="btn btn--ghost btn--sm" @click="openEdit(subject)">
                Edit
              </button>
              <button
                type="button"
                class="btn btn--ghost btn--sm btn--danger-text"
                @click="confirmDelete(subject)"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <dialog ref="dialogRef" class="modal" @close="onDialogClose">
      <form class="modal__body" @submit.prevent="saveSubject">
        <h3 class="modal__title">{{ editingId ? 'Edit Subject' : 'Add Subject' }}</h3>
        <div class="form-grid">
          <label class="field">
            <span class="field__label">Code</span>
            <input v-model="form.code" class="field__input" required maxlength="50" />
          </label>
          <label class="field">
            <span class="field__label">Name</span>
            <input v-model="form.name" class="field__input" required maxlength="255" />
          </label>
          <label class="field form-grid--full">
            <span class="field__label">Description</span>
            <textarea v-model="form.description" class="field__input" rows="3" />
          </label>
        </div>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <div class="modal__actions">
          <button type="button" class="btn btn--secondary" @click="closeDialog">Cancel</button>
          <button type="submit" class="btn btn--primary" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save Subject' }}
          </button>
        </div>
      </form>
    </dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import LoadingState from '@/components/ui/LoadingState.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';
import {
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '@/api/subjects';
import { getErrorMessage } from '@/api/client';
import { useToast } from '@/composables/useToast';
import type { Subject } from '@/types/teacher';

const { showToast } = useToast();

const subjects = ref<Subject[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const dialogRef = ref<HTMLDialogElement | null>(null);
const editingId = ref<string | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);

const form = reactive({
  code: '',
  name: '',
  description: '',
});

async function load() {
  loading.value = true;
  error.value = null;
  try {
    subjects.value = await fetchSubjects();
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.code = '';
  form.name = '';
  form.description = '';
  formError.value = null;
  editingId.value = null;
}

function openCreate() {
  resetForm();
  dialogRef.value?.showModal();
}

function openEdit(subject: Subject) {
  editingId.value = subject.id;
  form.code = subject.code;
  form.name = subject.name;
  form.description = subject.description ?? '';
  formError.value = null;
  dialogRef.value?.showModal();
}

function closeDialog() {
  dialogRef.value?.close();
}

function onDialogClose() {
  resetForm();
}

async function saveSubject() {
  saving.value = true;
  formError.value = null;
  try {
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
    };
    if (editingId.value) {
      await updateSubject(editingId.value, payload);
      showToast('Subject updated.');
    } else {
      await createSubject(payload);
      showToast('Subject created.');
    }
    closeDialog();
    await load();
  } catch (err) {
    formError.value = getErrorMessage(err);
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(subject: Subject) {
  if (!window.confirm(`Delete subject "${subject.name}"? This cannot be undone.`)) return;
  try {
    await deleteSubject(subject.id);
    showToast('Subject deleted.');
    await load();
  } catch (err) {
    window.alert(getErrorMessage(err));
  }
}

onMounted(load);
</script>
