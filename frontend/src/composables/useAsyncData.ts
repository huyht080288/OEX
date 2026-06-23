import { onMounted, ref } from 'vue';
import { getErrorMessage } from '@/api/client';

export function useAsyncData<T>(fetcher: () => Promise<T>, immediate = true) {
  const data = ref<T | null>(null) as { value: T | null };
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function execute() {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fetcher();
    } catch (err) {
      error.value = getErrorMessage(err);
      data.value = null;
    } finally {
      loading.value = false;
    }
  }

  if (immediate) {
    onMounted(execute);
  }

  return { data, loading, error, retry: execute };
}
