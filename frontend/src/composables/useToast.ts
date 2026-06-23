import { ref } from 'vue';

const toastMessage = ref<string | null>(null);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function useToast() {
  function showToast(message: string) {
    toastMessage.value = message;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      toastMessage.value = null;
    }, 4000);
  }

  return { toastMessage, showToast };
}
