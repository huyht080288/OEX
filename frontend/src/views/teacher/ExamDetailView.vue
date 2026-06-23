<template>
  <section>
    <LoadingState v-if="loading" message="Loading exam…" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <template v-else-if="exam">
      <header class="page-header">
        <p class="page-header__breadcrumb">
          <RouterLink to="/exams">Exams</RouterLink>
          <span aria-hidden="true"> / </span>
          <span>{{ exam.title }}</span>
        </p>
        <div class="page-header--row">
          <div>
            <h2 class="page-header__title">{{ exam.title }}</h2>
            <p class="page-header__subtitle">
              <StatusBadge :status="exam.status" />
              <span class="exam-meta">{{ subjectName }}</span>
            </p>
          </div>
          <div class="page-header__actions">
            <RouterLink class="btn btn--secondary" :to="`/exams/${exam.id}/results`">
              View Results
            </RouterLink>
            <button
              v-if="exam.status === 'DRAFT'"
              type="button"
              class="btn btn--primary"
              :disabled="publishing"
              @click="publish"
            >
              {{ publishing ? 'Publishing…' : 'Publish Exam' }}
            </button>
            <button
              v-if="exam.status === 'PUBLISHED'"
              type="button"
              class="btn btn--secondary"
              :disabled="closing"
              @click="closeExam"
            >
              {{ closing ? 'Closing…' : 'Close Exam' }}
            </button>
          </div>
        </div>
      </header>

      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="tabs__btn"
          :class="{ 'tabs__btn--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Details tab -->
      <form v-if="activeTab === 'details'" class="form-card" @submit.prevent="saveDetails">
        <div class="form-grid">
          <label class="field form-grid--full">
            <span class="field__label">Title</span>
            <input
              v-model="detailsForm.title"
              class="field__input"
              required
              :disabled="!isDraft"
            />
          </label>
          <label class="field form-grid--full">
            <span class="field__label">Description</span>
            <textarea
              v-model="detailsForm.description"
              class="field__input"
              rows="3"
              :disabled="!isDraft"
            />
          </label>
          <label class="field">
            <span class="field__label">Duration (minutes)</span>
            <input
              v-model.number="detailsForm.durationMinutes"
              class="field__input"
              type="number"
              min="1"
              :disabled="!isDraft"
            />
          </label>
          <label class="field">
            <span class="field__label">Max attempts</span>
            <input
              v-model.number="detailsForm.maxAttempts"
              class="field__input"
              type="number"
              min="1"
              :disabled="!isDraft"
            />
          </label>
          <label class="field">
            <span class="field__label">Open date/time</span>
            <input
              v-model="detailsForm.openAt"
              class="field__input"
              type="datetime-local"
              :disabled="!isDraft"
            />
          </label>
          <label class="field">
            <span class="field__label">Close date/time</span>
            <input
              v-model="detailsForm.closeAt"
              class="field__input"
              type="datetime-local"
              :disabled="!isDraft"
            />
          </label>
          <label class="field field--checkbox">
            <input
              v-model="detailsForm.showAnswersAfterSubmit"
              type="checkbox"
              :disabled="!isDraft"
            />
            <span class="field__label">Show answers after submit</span>
          </label>
        </div>
        <p v-if="detailsError" class="form-error">{{ detailsError }}</p>
        <div v-if="isDraft" class="form-actions">
          <button type="submit" class="btn btn--primary" :disabled="savingDetails">
            {{ savingDetails ? 'Saving…' : 'Save Changes' }}
          </button>
        </div>
        <p v-else class="form-hint">Exam settings cannot be changed after publishing.</p>
      </form>

      <!-- Questions tab -->
      <div v-else-if="activeTab === 'questions'" class="form-card">
        <template v-if="isDraft">
          <div class="filter-bar">
            <label class="field">
              <span class="field__label">Search questions</span>
              <input
                v-model="questionSearch"
                class="field__input"
                placeholder="Filter by text…"
              />
            </label>
          </div>
          <p class="form-hint">Select questions and reorder them for this exam.</p>
          <ul class="picker-list">
            <li
              v-for="q in filteredBankQuestions"
              :key="q.id"
              class="picker-list__item"
            >
              <label class="picker-list__label">
                <input
                  v-model="selectedIds"
                  type="checkbox"
                  :value="q.id"
                />
                <span>{{ q.content }}</span>
                <span class="picker-list__meta">{{ q.points }} pts · {{ q.difficulty }}</span>
              </label>
            </li>
          </ul>
          <EmptyState
            v-if="!filteredBankQuestions.length"
            title="No questions in bank"
            description="Add questions to this subject first."
            action-label="Go to Question Bank"
            @action="router.push(`/subjects/${exam.subjectId}/questions`)"
          />
          <div v-if="orderedSelected.length" class="ordered-list">
            <h3 class="ordered-list__title">Exam order</h3>
            <ol>
              <li v-for="(q, index) in orderedSelected" :key="q.id" class="ordered-list__item">
                <span class="ordered-list__text">{{ q.content }}</span>
                <div class="ordered-list__actions">
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    :disabled="index === 0"
                    @click="moveUp(index)"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    :disabled="index === orderedSelected.length - 1"
                    @click="moveDown(index)"
                  >
                    Down
                  </button>
                </div>
              </li>
            </ol>
          </div>
          <p v-if="questionsError" class="form-error">{{ questionsError }}</p>
          <div class="form-actions">
            <button
              type="button"
              class="btn btn--primary"
              :disabled="savingQuestions || !orderedSelected.length"
              @click="saveQuestions"
            >
              {{ savingQuestions ? 'Saving…' : 'Save Questions' }}
            </button>
          </div>
        </template>
        <template v-else>
          <ol class="readonly-questions">
            <li v-for="eq in exam.questions" :key="eq.question.id">
              <span>{{ eq.orderIndex }}. {{ eq.question.content }}</span>
              <span class="picker-list__meta">{{ eq.question.points }} pts</span>
            </li>
          </ol>
          <p v-if="!exam.questions?.length" class="form-hint">No questions in this exam.</p>
        </template>
      </div>

      <!-- Assign tab -->
      <div v-else-if="activeTab === 'assign'" class="form-card">
        <template v-if="exam.status !== 'CLOSED'">
          <div class="filter-bar">
            <label class="field">
              <span class="field__label">Search students</span>
              <input
                v-model="studentSearch"
                class="field__input"
                placeholder="Name or email…"
                @input="debouncedStudentSearch"
              />
            </label>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="data-table__check">
                    <input
                      type="checkbox"
                      :checked="allStudentsSelected"
                      @change="toggleAllStudents"
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="student in unassignedStudents" :key="student.id">
                  <td class="data-table__check">
                    <input v-model="selectedStudentIds" type="checkbox" :value="student.id" />
                  </td>
                  <td>{{ student.fullName }}</td>
                  <td>{{ student.email }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="form-actions">
            <button
              type="button"
              class="btn btn--primary"
              :disabled="assigning || !selectedStudentIds.length"
              @click="assignSelected"
            >
              {{ assigning ? 'Assigning…' : 'Assign Selected' }}
            </button>
          </div>
        </template>
        <p v-else class="form-hint">This exam is closed. Assignments are read-only.</p>

        <h3 class="section-title">Assigned students</h3>
        <EmptyState
          v-if="!assignments.length"
          title="No students assigned"
          description="Search and assign students above."
        />
        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Assigned</th>
                <th class="data-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in assignments" :key="a.id">
                <td>{{ a.student.fullName }}</td>
                <td>{{ a.student.email }}</td>
                <td>{{ formatDateTime(a.assignedAt) }}</td>
                <td class="data-table__actions">
                  <button
                    v-if="exam.status !== 'CLOSED'"
                    type="button"
                    class="btn btn--ghost btn--sm btn--danger-text"
                    @click="removeAssigned(a.id)"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="assignError" class="form-error">{{ assignError }}</p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LoadingState from '@/components/ui/LoadingState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import {
  fetchExam,
  updateExam,
  setExamQuestions,
  updateExamStatus,
  assignStudents,
  removeAssignment,
} from '@/api/exams';
import { fetchQuestions } from '@/api/questions';
import { fetchSubjects } from '@/api/subjects';
import { fetchStudents } from '@/api/students';
import { getErrorMessage } from '@/api/client';
import { datetimeLocalToIso, formatDateTime, isoToDatetimeLocal } from '@/utils/datetime';
import { useToast } from '@/composables/useToast';
import type { Exam, ExamAssignment, Question, Subject } from '@/types/teacher';

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const examId = computed(() => route.params.id as string);
const exam = ref<Exam | null>(null);
const subjects = ref<Subject[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const activeTab = ref<'details' | 'questions' | 'assign'>('details');
const tabs = [
  { id: 'details' as const, label: 'Details' },
  { id: 'questions' as const, label: 'Questions' },
  { id: 'assign' as const, label: 'Assign Students' },
];

const isDraft = computed(() => exam.value?.status === 'DRAFT');
const subjectName = computed(
  () => subjects.value.find((s) => s.id === exam.value?.subjectId)?.name ?? '',
);

const detailsForm = reactive({
  title: '',
  description: '',
  durationMinutes: 60,
  openAt: '',
  closeAt: '',
  maxAttempts: 1,
  showAnswersAfterSubmit: false,
});
const savingDetails = ref(false);
const detailsError = ref<string | null>(null);
const publishing = ref(false);
const closing = ref(false);

const bankQuestions = ref<Question[]>([]);
const questionSearch = ref('');
const selectedIds = ref<string[]>([]);
const savingQuestions = ref(false);
const questionsError = ref<string | null>(null);

const studentSearch = ref('');
const availableStudents = ref<{ id: string; email: string; fullName: string }[]>([]);
const selectedStudentIds = ref<string[]>([]);
const assignments = ref<ExamAssignment[]>([]);
const assigning = ref(false);
const assignError = ref<string | null>(null);

let studentDebounce: ReturnType<typeof setTimeout> | null = null;

const filteredBankQuestions = computed(() => {
  const q = questionSearch.value.trim().toLowerCase();
  if (!q) return bankQuestions.value;
  return bankQuestions.value.filter((item) => item.content.toLowerCase().includes(q));
});

const orderedSelected = computed(() => {
  const map = new Map(bankQuestions.value.map((q) => [q.id, q]));
  return selectedIds.value.map((id) => map.get(id)).filter(Boolean) as Question[];
});

const allStudentsSelected = computed(
  () =>
    unassignedStudents.value.length > 0 &&
    unassignedStudents.value.every((s) => selectedStudentIds.value.includes(s.id)),
);

const assignedStudentIds = computed(() => new Set(assignments.value.map((a) => a.studentId)));

const unassignedStudents = computed(() =>
  availableStudents.value.filter((s) => !assignedStudentIds.value.has(s.id)),
);

function syncDetailsForm() {
  if (!exam.value) return;
  detailsForm.title = exam.value.title;
  detailsForm.description = exam.value.description ?? '';
  detailsForm.durationMinutes = exam.value.durationMinutes;
  detailsForm.openAt = isoToDatetimeLocal(exam.value.openAt);
  detailsForm.closeAt = isoToDatetimeLocal(exam.value.closeAt);
  detailsForm.maxAttempts = exam.value.maxAttempts;
  detailsForm.showAnswersAfterSubmit = exam.value.showAnswersAfterSubmit;
}

function syncQuestionSelection() {
  if (!exam.value?.questions) {
    selectedIds.value = [];
    return;
  }
  selectedIds.value = [...exam.value.questions]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((eq) => eq.question.id);
}

async function loadBankQuestions() {
  if (!exam.value) return;
  bankQuestions.value = await fetchQuestions({ subjectId: exam.value.subjectId });
}

async function loadStudents() {
  availableStudents.value = await fetchStudents(studentSearch.value.trim() || undefined);
}

function debouncedStudentSearch() {
  if (studentDebounce) clearTimeout(studentDebounce);
  studentDebounce = setTimeout(loadStudents, 300);
}

function toggleAllStudents(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked) {
    selectedStudentIds.value = unassignedStudents.value.map((s) => s.id);
  } else {
    selectedStudentIds.value = [];
  }
}

function moveUp(index: number) {
  if (index <= 0) return;
  const ids = [...selectedIds.value];
  [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
  selectedIds.value = ids;
}

function moveDown(index: number) {
  if (index >= selectedIds.value.length - 1) return;
  const ids = [...selectedIds.value];
  [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
  selectedIds.value = ids;
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    [exam.value, subjects.value] = await Promise.all([
      fetchExam(examId.value),
      fetchSubjects(),
    ]);
    assignments.value = exam.value.assignments ?? [];
    syncDetailsForm();
    syncQuestionSelection();
    await Promise.all([loadBankQuestions(), loadStudents()]);
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function saveDetails() {
  if (!exam.value || !isDraft.value) return;
  savingDetails.value = true;
  detailsError.value = null;
  try {
    exam.value = await updateExam(exam.value.id, {
      title: detailsForm.title.trim(),
      description: detailsForm.description.trim() || undefined,
      durationMinutes: detailsForm.durationMinutes,
      openAt: datetimeLocalToIso(detailsForm.openAt),
      closeAt: datetimeLocalToIso(detailsForm.closeAt),
      maxAttempts: detailsForm.maxAttempts,
      showAnswersAfterSubmit: detailsForm.showAnswersAfterSubmit,
    });
    showToast('Exam updated.');
  } catch (err) {
    detailsError.value = getErrorMessage(err);
  } finally {
    savingDetails.value = false;
  }
}

async function saveQuestions() {
  if (!exam.value) return;
  savingQuestions.value = true;
  questionsError.value = null;
  try {
    exam.value = await setExamQuestions(exam.value.id, selectedIds.value);
    syncQuestionSelection();
    showToast('Questions saved.');
  } catch (err) {
    questionsError.value = getErrorMessage(err);
  } finally {
    savingQuestions.value = false;
  }
}

async function publish() {
  if (!exam.value) return;
  publishing.value = true;
  try {
    exam.value = await updateExamStatus(exam.value.id, 'PUBLISHED');
    showToast('Exam published.');
  } catch (err) {
    window.alert(getErrorMessage(err));
  } finally {
    publishing.value = false;
  }
}

async function closeExam() {
  if (!exam.value) return;
  if (!window.confirm('Close this exam? Students will no longer be able to start new attempts.')) {
    return;
  }
  closing.value = true;
  try {
    exam.value = await updateExamStatus(exam.value.id, 'CLOSED');
    showToast('Exam closed.');
  } catch (err) {
    window.alert(getErrorMessage(err));
  } finally {
    closing.value = false;
  }
}

async function assignSelected() {
  if (!exam.value) return;
  assigning.value = true;
  assignError.value = null;
  try {
    const created = await assignStudents(exam.value.id, selectedStudentIds.value);
    assignments.value = [...assignments.value, ...created];
    selectedStudentIds.value = [];
    showToast('Students assigned.');
  } catch (err) {
    assignError.value = getErrorMessage(err);
  } finally {
    assigning.value = false;
  }
}

async function removeAssigned(assignmentId: string) {
  if (!exam.value) return;
  if (!window.confirm('Remove this student from the exam?')) return;
  try {
    await removeAssignment(exam.value.id, assignmentId);
    assignments.value = assignments.value.filter((a) => a.id !== assignmentId);
    showToast('Assignment removed.');
  } catch (err) {
    assignError.value = getErrorMessage(err);
  }
}

watch(
  () => route.params.id,
  () => {
    if (route.name === 'exam-detail') load();
  },
);

onMounted(load);
</script>
