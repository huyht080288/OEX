<template>
  <div class="state state--empty">
    <h2 class="state__title">{{ title }}</h2>
    <p class="state__text">{{ description }}</p>
    <div v-if="actionLabel || $slots.action" class="state__action">
      <slot name="action">
        <button type="button" class="btn btn--primary" @click="emit('action')">
          {{ actionLabel }}
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  actionLabel?: string;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>
