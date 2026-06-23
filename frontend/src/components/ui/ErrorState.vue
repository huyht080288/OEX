<template>
  <div class="state state--error" role="alert">
    <h2 class="state__title">{{ title }}</h2>
    <p class="state__text">{{ message }}</p>
    <button v-if="showRetry" type="button" class="btn btn--secondary" @click="$emit('retry')">
      Try again
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    message: string;
    showRetry?: boolean;
  }>(),
  {
    title: 'Could not load data',
    showRetry: true,
  },
);

defineEmits<{ retry: [] }>();
</script>
