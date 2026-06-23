<template>
  <span class="badge" :class="`badge--${variant}`">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ExamStatus } from '@/types/teacher';

const props = defineProps<{
  status: ExamStatus | string;
}>();

const label = computed(() => {
  switch (props.status) {
    case 'DRAFT':
      return 'Draft';
    case 'PUBLISHED':
      return 'Published';
    case 'CLOSED':
      return 'Closed';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'SUBMITTED':
      return 'Submitted';
    case 'EXPIRED':
      return 'Expired';
    case 'NOT_STARTED':
      return 'Not Started';
    case 'ACTIVE':
      return 'Active';
    case 'INACTIVE':
      return 'Inactive';
    default:
      return props.status;
  }
});

const variant = computed(() => {
  switch (props.status) {
    case 'DRAFT':
      return 'muted';
    case 'PUBLISHED':
      return 'success';
    case 'CLOSED':
      return 'danger';
    case 'IN_PROGRESS':
      return 'warning';
    case 'SUBMITTED':
      return 'success';
    case 'EXPIRED':
      return 'danger';
    case 'NOT_STARTED':
      return 'muted';
    case 'ACTIVE':
      return 'success';
    case 'INACTIVE':
      return 'danger';
    default:
      return 'muted';
  }
});
</script>
