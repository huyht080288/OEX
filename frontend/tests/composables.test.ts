// @vitest-environment jsdom

import { defineComponent, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAsyncData } from '@/composables/useAsyncData';
import { useToast } from '@/composables/useToast';

describe('useAsyncData', () => {
  it('loads data immediately on mount', async () => {
    const fetcher = vi.fn().mockResolvedValue('loaded');
    const component = defineComponent({
      setup: () => useAsyncData(fetcher),
      template: '<div />',
    });

    const wrapper = mount(component);
    await flushPromises();

    expect(fetcher).toHaveBeenCalledOnce();
    expect(wrapper.vm.data).toBe('loaded');
    expect(wrapper.vm.loading).toBe(false);
    expect(wrapper.vm.error).toBeNull();
  });

  it('captures errors and supports retry when immediate is false', async () => {
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce('recovered');
    const component = defineComponent({
      setup: () => useAsyncData(fetcher, false),
      template: '<div />',
    });

    const wrapper = mount(component);
    expect(fetcher).not.toHaveBeenCalled();

    await wrapper.vm.retry();
    expect(wrapper.vm.data).toBeNull();
    expect(wrapper.vm.error).toBe('Request failed');

    await wrapper.vm.retry();
    expect(wrapper.vm.data).toBe('recovered');
    expect(wrapper.vm.error).toBeNull();
  });
});

describe('useToast', () => {
  afterEach(() => vi.useRealTimers());

  it('shows, replaces, and automatically hides a toast', async () => {
    vi.useFakeTimers();
    const { toastMessage, showToast } = useToast();

    showToast('Saved');
    expect(toastMessage.value).toBe('Saved');

    vi.advanceTimersByTime(1000);
    showToast('Updated');
    expect(toastMessage.value).toBe('Updated');

    vi.advanceTimersByTime(4000);
    await nextTick();
    expect(toastMessage.value).toBeNull();
  });
});
