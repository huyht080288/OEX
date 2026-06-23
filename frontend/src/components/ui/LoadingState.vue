<template>
  <div class="state state--loading" role="status" aria-live="polite">
    <div class="state__spinner" aria-hidden="true" />
    <p>{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string;
  }>(),
  { message: 'Loading…' },
);
</script>
