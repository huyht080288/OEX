<template>
  <section class="result-page">
    <LoadingState v-if="loading" message="Loading result…" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else-if="result">
      <header class="page-header">
        <p class="page-header__breadcrumb">
          <RouterLink to="/my-exams">My Exams</RouterLink>
          <span aria-hidden="true"> / </span>
          <span>{{ result.examTitle }}</span>
        </p>
        <h2 class="page-header__title">Exam Result</h2>
      </header>

      <article class="result-card">
        <p class="result-card__headline">
          Your score: <strong>{{ result.score }} / {{ result.maxScore }}</strong>
        </p>
        <dl class="result-card__summary">
          <div>
            <dt>Correct answers</dt>
            <dd>{{ result.correctCount }} / {{ result.totalQuestions }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd><StatusBadge :status="result.status" /></dd>
          </div>
          <div v-if="result.submittedAt">
            <dt>Submitted</dt>
            <dd>{{ formatDateTime(result.submittedAt) }}</dd>
          </div>
        </dl>
      </article>

      <section v-if="result.review.length" class="result-review">
        <h3 class="section-title">Answer review</h3>
        <ul class="result-review__list">
          <li
            v-for="item in result.review"
            :key="item.questionId"
            class="result-review__item"
            :class="{ 'result-review__item--correct': item.isCorrect }"
          >
            <p class="result-review__question">{{ item.content }}</p>
            <p class="result-review__answer">
              <span>Your answer:</span>
              {{
                item.selectedOption
                  ? `${item.selectedOption.content}`
                  : 'No answer'
              }}
            </p>
            <p v-if="!item.isCorrect && item.correctOption" class="result-review__correct">
              Correct answer: {{ item.correctOption.content }}
            </p>
            <p class="result-review__points">{{ item.points }} pt{{ item.points === 1 ? '' : 's' }}</p>
          </li>
        </ul>
      </section>

      <div class="form-actions result-page__actions">
        <RouterLink class="btn btn--primary" to="/my-exams">Back to My Exams</RouterLink>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import LoadingState from '@/components/ui/LoadingState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { fetchAttemptResult } from '@/api/attempts';
import { getErrorMessage } from '@/api/client';
import { formatDateTime } from '@/utils/datetime';
import type { AttemptResult } from '@/types/student';

const route = useRoute();
const attemptId = computed(() => route.params.attemptId as string);

const result = ref<AttemptResult | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    result.value = await fetchAttemptResult(attemptId.value);
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
