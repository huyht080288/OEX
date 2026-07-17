// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  route: {
    name: 'subject-questions',
    params: { id: 'subject-1' },
    query: {} as Record<string, unknown>,
  },
  showToast: vi.fn(),
  fetchUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  updateUserStatus: vi.fn(),
  fetchSubjects: vi.fn(),
  createSubject: vi.fn(),
  updateSubject: vi.fn(),
  deleteSubject: vi.fn(),
  fetchQuestions: vi.fn(),
  fetchQuestion: vi.fn(),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  createExam: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
  useRoute: () => mocks.route,
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock('@/api/users', () => ({
  fetchUsers: mocks.fetchUsers,
  createUser: mocks.createUser,
  updateUser: mocks.updateUser,
  updateUserStatus: mocks.updateUserStatus,
}));

vi.mock('@/api/subjects', () => ({
  fetchSubjects: mocks.fetchSubjects,
  createSubject: mocks.createSubject,
  updateSubject: mocks.updateSubject,
  deleteSubject: mocks.deleteSubject,
}));

vi.mock('@/api/questions', () => ({
  fetchQuestions: mocks.fetchQuestions,
  fetchQuestion: mocks.fetchQuestion,
  createQuestion: mocks.createQuestion,
  updateQuestion: mocks.updateQuestion,
  deleteQuestion: mocks.deleteQuestion,
}));

vi.mock('@/api/exams', () => ({
  createExam: mocks.createExam,
}));

import UserListView from '@/views/admin/UserListView.vue';
import ExamNewView from '@/views/teacher/ExamNewView.vue';
import QuestionBankView from '@/views/teacher/QuestionBankView.vue';
import QuestionFormView from '@/views/teacher/QuestionFormView.vue';
import SubjectListView from '@/views/teacher/SubjectListView.vue';

const stubs = {
  RouterLink: { template: '<a><slot /></a>' },
  LoadingState: { template: '<p>Loading</p>' },
  ErrorState: { props: ['message'], template: '<p class="error">{{ message }}</p>' },
  EmptyState: { props: ['title'], template: '<p class="empty">{{ title }}</p>' },
  StatusBadge: { props: ['status'], template: '<span>{{ status }}</span>' },
};

function vmOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.vm as unknown as Record<string, any>;
}

describe('UserListView', () => {
  const user = {
    id: 'user-1',
    email: 'student@oex.test',
    fullName: 'Student One',
    role: 'STUDENT',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchUsers.mockResolvedValue([user]);
    mocks.createUser.mockResolvedValue(user);
    mocks.updateUser.mockResolvedValue(user);
    mocks.updateUserStatus.mockResolvedValue(user);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('loads, creates, edits, and deactivates users', async () => {
    const wrapper = mount(UserListView, { global: { stubs } });
    await flushPromises();
    const vm = vmOf(wrapper);

    expect(wrapper.text()).toContain('Student One');
    expect(vm.roleLabel('ADMIN')).toBe('Admin');
    expect(vm.roleLabel('TEACHER')).toBe('Teacher');

    vm.openCreate();
    vm.form.email = 'new@oex.test';
    vm.form.password = 'Password123!';
    vm.form.fullName = 'New User';
    vm.form.role = 'STUDENT';
    await vm.saveUser();
    expect(mocks.createUser).toHaveBeenCalledWith({
      email: 'new@oex.test',
      password: 'Password123!',
      fullName: 'New User',
      role: 'STUDENT',
    });

    vm.openEdit(user);
    vm.form.fullName = 'Updated User';
    await vm.saveUser();
    expect(mocks.updateUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ fullName: 'Updated User' }),
    );

    await vm.toggleStatus(user);
    expect(mocks.updateUserStatus).toHaveBeenCalledWith('user-1', false);
    expect(mocks.showToast).toHaveBeenCalledWith('User deactivated.');
  });

  it('shows load and save errors', async () => {
    mocks.fetchUsers.mockRejectedValueOnce(new Error('Users unavailable'));
    const wrapper = mount(UserListView, { global: { stubs } });
    await flushPromises();
    expect(wrapper.get('.error').text()).toBe('Users unavailable');

    mocks.fetchUsers.mockResolvedValue([]);
    mocks.createUser.mockRejectedValue(new Error('Duplicate email'));
    const second = mount(UserListView, { global: { stubs } });
    await flushPromises();
    const vm = vmOf(second);
    vm.openCreate();
    await vm.saveUser();
    expect(vm.formError).toBe('Duplicate email');
  });
});

describe('SubjectListView', () => {
  const subject = {
    id: 'subject-1',
    code: 'CS101',
    name: 'Computer Science',
    description: 'Foundations',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchSubjects.mockResolvedValue([subject]);
    mocks.createSubject.mockResolvedValue(subject);
    mocks.updateSubject.mockResolvedValue(subject);
    mocks.deleteSubject.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('creates, edits, and deletes subjects', async () => {
    const wrapper = mount(SubjectListView, { global: { stubs } });
    await flushPromises();
    const vm = vmOf(wrapper);

    vm.openCreate();
    vm.form.code = 'MATH';
    vm.form.name = 'Mathematics';
    await vm.saveSubject();
    expect(mocks.createSubject).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'MATH', name: 'Mathematics' }),
    );

    vm.openEdit(subject);
    vm.form.name = 'Computing';
    await vm.saveSubject();
    expect(mocks.updateSubject).toHaveBeenCalledWith(
      'subject-1',
      expect.objectContaining({ name: 'Computing' }),
    );

    await vm.confirmDelete(subject);
    expect(mocks.deleteSubject).toHaveBeenCalledWith('subject-1');
    expect(mocks.showToast).toHaveBeenCalledWith('Subject deleted.');
  });
});

describe('QuestionBankView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.route.name = 'subject-questions';
    mocks.route.params = { id: 'subject-1' };
    mocks.route.query = {};
    mocks.fetchSubjects.mockResolvedValue([{ id: 'subject-1', name: 'Computer Science' }]);
    mocks.fetchQuestions.mockResolvedValue([
      {
        id: 'q1',
        content: 'What is two plus two?',
        difficulty: 'EASY',
        points: 1,
        options: [],
      },
    ]);
    mocks.deleteQuestion.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => vi.useRealTimers());

  it('loads, filters, navigates, and deletes questions', async () => {
    const wrapper = mount(QuestionBankView, { global: { stubs } });
    await flushPromises();
    const vm = vmOf(wrapper);

    expect(wrapper.text()).toContain('What is two plus two?');
    expect(vm.formatDifficulty('MEDIUM')).toBe('Medium');
    vm.goToNew();
    expect(mocks.push).toHaveBeenCalledWith({
      name: 'question-new',
      query: { subjectId: 'subject-1' },
    });

    vm.search = 'two';
    vm.debouncedLoad();
    vi.advanceTimersByTime(300);
    await flushPromises();
    expect(mocks.fetchQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({ subjectId: 'subject-1', q: 'two' }),
    );

    await vm.confirmDelete('q1');
    expect(mocks.deleteQuestion).toHaveBeenCalledWith('q1');
  });
});

describe('QuestionFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.route.name = 'question-new';
    mocks.route.params = { id: 'question-1' };
    mocks.route.query = { subjectId: 'subject-1' };
    mocks.fetchSubjects.mockResolvedValue([{ id: 'subject-1', name: 'Computer Science' }]);
    mocks.createQuestion.mockResolvedValue({ id: 'question-new' });
    mocks.updateQuestion.mockResolvedValue({ id: 'question-1' });
  });

  it('manages options and creates a question', async () => {
    const wrapper = mount(QuestionFormView, { global: { stubs } });
    await flushPromises();
    const vm = vmOf(wrapper);

    vm.form.content = ' What is Vue? ';
    vm.form.options[0].content = ' A framework ';
    vm.form.options[1].content = 'A database';
    vm.addOption();
    expect(vm.form.options).toHaveLength(3);
    vm.removeOption(2);
    expect(vm.form.options).toHaveLength(2);

    await vm.save();
    expect(mocks.createQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: 'subject-1',
        content: 'What is Vue?',
      }),
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Question saved.');

    vm.cancel();
    expect(mocks.push).toHaveBeenCalledWith('/subjects/subject-1/questions');
  });

  it('loads and updates an existing question', async () => {
    mocks.route.name = 'question-edit';
    mocks.fetchQuestion.mockResolvedValue({
      id: 'question-1',
      subjectId: 'subject-1',
      content: 'Existing question',
      difficulty: 'HARD',
      points: 2,
      options: [
        { id: 'o1', label: 'A', content: 'Correct', isCorrect: true },
        { id: 'o2', label: 'B', content: 'Wrong', isCorrect: false },
      ],
    });
    const wrapper = mount(QuestionFormView, { global: { stubs } });
    await flushPromises();
    const vm = vmOf(wrapper);

    expect(vm.form.content).toBe('Existing question');
    await vm.save();
    expect(mocks.updateQuestion).toHaveBeenCalledWith(
      'question-1',
      expect.objectContaining({ difficulty: 'HARD' }),
    );
  });

  it('validates exactly one correct option and reports API errors', async () => {
    const wrapper = mount(QuestionFormView, { global: { stubs } });
    await flushPromises();
    const vm = vmOf(wrapper);
    vm.form.options.forEach((option: { isCorrect: boolean }) => {
      option.isCorrect = false;
    });

    await vm.save();
    expect(vm.formError).toBe('Select exactly one correct answer.');

    vm.form.options[0].isCorrect = true;
    mocks.createQuestion.mockRejectedValue(new Error('Question rejected'));
    await vm.save();
    expect(vm.formError).toBe('Question rejected');
  });
});

describe('ExamNewView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchSubjects.mockResolvedValue([{ id: 'subject-1', name: 'Computer Science' }]);
    mocks.createExam.mockResolvedValue({ id: 'exam-new' });
  });

  it('loads a default subject and creates an exam', async () => {
    const wrapper = mount(ExamNewView, { global: { stubs } });
    await flushPromises();
    const vm = vmOf(wrapper);

    expect(vm.form.subjectId).toBe('subject-1');
    vm.form.title = ' New Exam ';
    vm.form.description = ' Description ';
    await vm.save();

    expect(mocks.createExam).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: 'subject-1',
        title: 'New Exam',
        description: 'Description',
      }),
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Exam created.');
    expect(mocks.push).toHaveBeenCalledWith('/exams/exam-new');
  });

  it('shows a create error', async () => {
    mocks.createExam.mockRejectedValue(new Error('Invalid dates'));
    const wrapper = mount(ExamNewView, { global: { stubs } });
    await flushPromises();

    await vmOf(wrapper).save();
    expect(vmOf(wrapper).formError).toBe('Invalid dates');
  });
});
