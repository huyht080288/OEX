<template>
  <Transition name="toast">
    <div v-if="toastMessage" class="toast" role="status" aria-live="polite">
      {{ toastMessage }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const { toastMessage } = useToast();
</script>
