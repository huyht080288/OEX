// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AppNav from '@/components/layout/AppNav.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';

describe('StatusBadge', () => {
  const cases = [
    ['DRAFT', 'Draft', 'badge--muted'],
    ['PUBLISHED', 'Published', 'badge--success'],
    ['CLOSED', 'Closed', 'badge--danger'],
    ['IN_PROGRESS', 'In Progress', 'badge--warning'],
    ['SUBMITTED', 'Submitted', 'badge--success'],
    ['EXPIRED', 'Expired', 'badge--danger'],
    ['NOT_STARTED', 'Not Started', 'badge--muted'],
    ['ACTIVE', 'Active', 'badge--success'],
    ['INACTIVE', 'Inactive', 'badge--danger'],
    ['CUSTOM', 'CUSTOM', 'badge--muted'],
  ] as const;

  it.each(cases)('renders %s as %s', (status, label, variant) => {
    const wrapper = mount(StatusBadge, { props: { status } });

    expect(wrapper.text()).toBe(label);
    expect(wrapper.classes()).toContain(variant);
  });
});

describe('empty and error states', () => {
  it('renders an empty state action and emits action', async () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No exams',
        description: 'Create an exam first.',
        actionLabel: 'Create exam',
      },
    });

    expect(wrapper.text()).toContain('No exams');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('action')).toHaveLength(1);
  });

  it('supports a custom action slot', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'Empty', description: 'Nothing here.' },
      slots: { action: '<a href="/new">New item</a>' },
    });

    expect(wrapper.get('a').attributes('href')).toBe('/new');
  });

  it('renders retry by default and can hide it', async () => {
    const wrapper = mount(ErrorState, { props: { message: 'Network error' } });

    expect(wrapper.text()).toContain('Could not load data');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);

    await wrapper.setProps({ showRetry: false });
    expect(wrapper.find('button').exists()).toBe(false);
  });
});

describe('AppNav', () => {
  it.each([
    ['ADMIN', ['Dashboard', 'User Management'], ['Subjects', 'My Exams']],
    ['TEACHER', ['Dashboard', 'Subjects', 'Exams'], ['User Management', 'My Exams']],
    ['STUDENT', ['Dashboard', 'My Exams'], ['Subjects', 'User Management']],
  ] as const)('shows links for %s', (role, visible, hidden) => {
    const wrapper = mount(AppNav, {
      props: { role },
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>',
          },
        },
      },
    });

    for (const label of visible) expect(wrapper.text()).toContain(label);
    for (const label of hidden) expect(wrapper.text()).not.toContain(label);
  });
});
