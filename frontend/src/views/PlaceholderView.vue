<template>
  <section class="placeholder">
    <EmptyState :title="title" :description="description">
      <template #action>
        <RouterLink class="btn btn--secondary" to="/">Back to dashboard</RouterLink>
      </template>
    </EmptyState>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import EmptyState from '@/components/ui/EmptyState.vue';

const route = useRoute();

const title = computed(() => (route.meta.placeholderTitle as string) ?? 'Coming soon');
const description = computed(
  () =>
    (route.meta.placeholderDescription as string) ??
    'This screen will be available in a future release.',
);
</script>
