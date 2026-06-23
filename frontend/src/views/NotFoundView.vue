<template>
  <section class="placeholder">
    <EmptyState
      title="Page not found"
      description="The page you requested does not exist or you may not have access."
    >
      <template #action>
        <RouterLink class="btn btn--primary" to="/">Go to dashboard</RouterLink>
      </template>
    </EmptyState>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/ui/EmptyState.vue';
</script>
