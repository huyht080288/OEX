<template>
  <div class="take-exam">
    <LoadingState v-if="loading" message="Loading exam…" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else-if="attempt">
      <header class="take-exam__header">
        <div class="take-exam__brand">
          <span class="take-exam__mark" aria-hidden="true">
            <OexMark />
          </span>
          <h1 class="take-exam__title">{{ attempt.examTitle }}</h1>
        </div>
        <p
          class="take-exam__timer"
          :class="{ 'take-exam__timer--urgent': remainingSeconds <= 300 }"
        >
          Time remaining: {{ formatCountdown(remainingSeconds) }}
        </p>
      </header>

      <div class="take-exam__body">
        <main class="take-exam__main">
          <div
            class="take-exam__progress-bar"
            role="progressbar"
            :aria-valuenow="currentIndex + 1"
            :aria-valuemin="1"
            :aria-valuemax="attempt.questions.length"
            :aria-label="`Question ${currentIndex + 1} of ${attempt.questions.length}`"
          >
            <div
              class="take-exam__progress-fill"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
          <p class="take-exam__progress">
            Question {{ currentIndex + 1 }} of {{ attempt.questions.length }}
          </p>
          <h2 class="take-exam__question">{{ currentQuestion?.content }}</h2>

          <fieldset class="take-exam__options">
            <legend class="sr-only">Answer options</legend>
            <label
              v-for="opt in currentQuestion?.options"
              :key="opt.id"
              class="take-exam__option"
              :class="{ 'take-exam__option--selected': answers[currentQuestion!.id] === opt.id }"
            >
              <input
                v-model="answers[currentQuestion!.id]"
                type="radio"
                :name="`q-${currentQuestion!.id}`"
                :value="opt.id"
                @change="onAnswerChange"
              />
              <span class="take-exam__option-label">{{ opt.label }}.</span>
              <span>{{ opt.content }}</span>
            </label>
          </fieldset>

          <div class="take-exam__nav">
            <button
              type="button"
              class="btn btn--secondary"
              :disabled="currentIndex === 0"
              @click="goPrev"
            >
              Previous
            </button>
            <button
              type="button"
              class="btn btn--secondary"
              :disabled="currentIndex >= attempt.questions.length - 1"
              @click="goNext"
            >
              Next
            </button>
          </div>
        </main>

        <aside class="take-exam__sidebar">
          <h3 class="take-exam__sidebar-title">Question Navigator</h3>
          <div class="take-exam__grid">
            <button
              v-for="(q, index) in attempt.questions"
              :key="q.id"
              type="button"
              class="take-exam__grid-btn"
              :class="{
                'take-exam__grid-btn--current': index === currentIndex,
                'take-exam__grid-btn--answered': !!answers[q.id],
              }"
              @click="currentIndex = index"
            >
              {{ index + 1 }}
            </button>
          </div>
          <dl class="take-exam__stats">
            <div>
              <dt>Answered</dt>
              <dd>{{ answeredCount }} / {{ attempt.questions.length }}</dd>
            </div>
            <div>
              <dt>Unanswered</dt>
              <dd>{{ attempt.questions.length - answeredCount }}</dd>
            </div>
          </dl>
          <button type="button" class="btn btn--primary btn--block" @click="openSubmitModal">
            Submit Exam
          </button>
        </aside>
      </div>

      <dialog ref="submitDialogRef" class="modal" @close="submitDialogOpen = false">
        <div class="modal__body">
          <h3 class="modal__title">Submit exam?</h3>
          <p class="modal__text">
            Are you sure you want to submit? You cannot change answers after submission.
          </p>
          <div class="modal__actions">
            <button type="button" class="btn btn--secondary" @click="closeSubmitModal">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn--primary"
              :disabled="submitting"
              @click="confirmSubmit"
            >
              {{ submitting ? 'Submitting…' : 'Submit Exam' }}
            </button>
          </div>
        </div>
      </dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LoadingState from '@/components/ui/LoadingState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';
import OexMark from '@/components/ui/OexMark.vue';
import { fetchAttempt, saveAnswers, submitAttempt } from '@/api/attempts';
import { getErrorCode, getErrorMessage } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { formatCountdown } from '@/utils/studentExam';
import type { InProgressAttempt } from '@/types/student';

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const attemptId = computed(() => route.params.attemptId as string);
const attempt = ref<InProgressAttempt | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const currentIndex = ref(0);
const answers = reactive<Record<string, string | null>>({});
const remainingSeconds = ref(0);
const submitting = ref(false);
const submitDialogRef = ref<HTMLDialogElement | null>(null);
const submitDialogOpen = ref(false);

let timerId: ReturnType<typeof setInterval> | null = null;
let saveTimerId: ReturnType<typeof setTimeout> | null = null;
let autoSubmitted = false;

const currentQuestion = computed(() => attempt.value?.questions[currentIndex.value]);

const answeredCount = computed(() => {
  if (!attempt.value) return 0;
  return attempt.value.questions.filter((q) => !!answers[q.id]).length;
});

const progressPercent = computed(() => {
  if (!attempt.value || attempt.value.questions.length === 0) return 0;
  return ((currentIndex.value + 1) / attempt.value.questions.length) * 100;
});

function syncAnswersFromAttempt(data: InProgressAttempt) {
  for (const key of Object.keys(answers)) {
    delete answers[key];
  }
  for (const [qId, optId] of Object.entries(data.answers)) {
    answers[qId] = optId;
  }
}

function updateTimer() {
  if (!attempt.value) return;
  const diff = Math.floor(
    (new Date(attempt.value.expiresAt).getTime() - Date.now()) / 1000,
  );
  remainingSeconds.value = Math.max(0, diff);
  if (diff <= 0 && !autoSubmitted && !submitting.value) {
    void handleAutoSubmit();
  }
}

function startTimer() {
  updateTimer();
  timerId = setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function buildAnswerPayload() {
  if (!attempt.value) return [];
  return attempt.value.questions.map((q) => ({
    questionId: q.id,
    selectedOptionId: answers[q.id] ?? null,
  }));
}

function scheduleSave() {
  if (saveTimerId) clearTimeout(saveTimerId);
  saveTimerId = setTimeout(async () => {
    if (!attempt.value) return;
    try {
      const updated = await saveAnswers(attempt.value.attemptId, buildAnswerPayload());
      attempt.value.expiresAt = updated.expiresAt;
    } catch {
      // Silent fail on autosave; user can still submit
    }
  }, 500);
}

function onAnswerChange() {
  scheduleSave();
}

function goPrev() {
  if (currentIndex.value > 0) currentIndex.value -= 1;
}

function goNext() {
  if (attempt.value && currentIndex.value < attempt.value.questions.length - 1) {
    currentIndex.value += 1;
  }
}

function openSubmitModal() {
  submitDialogRef.value?.showModal();
  submitDialogOpen.value = true;
}

function closeSubmitModal() {
  submitDialogRef.value?.close();
}

async function confirmSubmit() {
  if (!attempt.value || submitting.value) return;
  submitting.value = true;
  try {
    await saveAnswers(attempt.value.attemptId, buildAnswerPayload());
    await submitAttempt(attempt.value.attemptId);
    stopTimer();
    window.removeEventListener('beforeunload', beforeUnload);
    showToast('Exam submitted.');
    router.replace(`/results/${attempt.value.attemptId}`);
  } catch (err) {
    const code = getErrorCode(err);
    if (code === 'ATTEMPT_EXPIRED') {
      await handleAutoSubmit();
    } else {
      window.alert(getErrorMessage(err));
    }
  } finally {
    submitting.value = false;
    closeSubmitModal();
  }
}

async function handleAutoSubmit() {
  if (!attempt.value || autoSubmitted) return;
  autoSubmitted = true;
  submitting.value = true;
  try {
    await submitAttempt(attempt.value.attemptId);
    stopTimer();
    window.removeEventListener('beforeunload', beforeUnload);
    showToast('Time is up. Your exam has been submitted.');
    router.replace(`/results/${attempt.value.attemptId}`);
  } catch (err) {
    const code = getErrorCode(err);
    if (code === 'ATTEMPT_EXPIRED' || code === 'VALIDATION_ERROR') {
      router.replace(`/results/${attempt.value.attemptId}`);
    } else {
      error.value = getErrorMessage(err);
    }
  } finally {
    submitting.value = false;
  }
}

function beforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
  event.returnValue = '';
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const data = await fetchAttempt(attemptId.value);
    attempt.value = data;
    syncAnswersFromAttempt(data);
    startTimer();
  } catch (err) {
    const code = getErrorCode(err);
    if (code === 'VALIDATION_ERROR' || code === 'ATTEMPT_EXPIRED') {
      router.replace(`/results/${attemptId.value}`);
      return;
    }
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload);
  void load();
});

onUnmounted(() => {
  stopTimer();
  if (saveTimerId) clearTimeout(saveTimerId);
  window.removeEventListener('beforeunload', beforeUnload);
});
</script>
