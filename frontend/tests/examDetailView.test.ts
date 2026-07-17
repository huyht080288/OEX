// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  route: { name: 'exam-detail', params: { id: 'exam-1' } },
  push: vi.fn(),
  showToast: vi.fn(),
  fetchExam: vi.fn(),
  updateExam: vi.fn(),
  setExamQuestions: vi.fn(),
  updateExamStatus: vi.fn(),
  assignStudents: vi.fn(),
  removeAssignment: vi.fn(),
  fetchQuestions: vi.fn(),
  fetchSubjects: vi.fn(),
  fetchStudents: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock('@/api/exams', () => ({
  fetchExam: mocks.fetchExam,
  updateExam: mocks.updateExam,
  setExamQuestions: mocks.setExamQuestions,
  updateExamStatus: mocks.updateExamStatus,
  assignStudents: mocks.assignStudents,
  removeAssignment: mocks.removeAssignment,
}));

vi.mock('@/api/questions', () => ({ fetchQuestions: mocks.fetchQuestions }));
vi.mock('@/api/subjects', () => ({ fetchSubjects: mocks.fetchSubjects }));
vi.mock('@/api/students', () => ({ fetchStudents: mocks.fetchStudents }));

import ExamDetailView from '@/views/teacher/ExamDetailView.vue';

const questions = [
  {
    id: 'q1',
    subjectId: 'subject-1',
    content: 'Question one',
    difficulty: 'EASY',
    points: 1,
    options: [],
  },
  {
    id: 'q2',
    subjectId: 'subject-1',
    content: 'Question two',
    difficulty: 'MEDIUM',
    points: 2,
    options: [],
  },
];

const exam = {
  id: 'exam-1',
  subjectId: 'subject-1',
  title: 'Midterm',
  description: 'Assessment',
  status: 'DRAFT',
  durationMinutes: 60,
  openAt: '2026-07-17T09:00:00.000Z',
  closeAt: '2026-07-17T11:00:00.000Z',
  maxAttempts: 1,
  showAnswersAfterSubmit: false,
  questions: [
    { orderIndex: 0, question: questions[0] },
    { orderIndex: 1, question: questions[1] },
  ],
  assignments: [],
};

describe('ExamDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    mocks.fetchExam.mockResolvedValue(structuredClone(exam));
    mocks.fetchSubjects.mockResolvedValue([
      { id: 'subject-1', code: 'CS', name: 'Computer Science' },
    ]);
    mocks.fetchQuestions.mockResolvedValue(structuredClone(questions));
    mocks.fetchStudents.mockResolvedValue([
      { id: 'student-1', email: 'student@oex.test', fullName: 'Student One' },
    ]);
    mocks.updateExam.mockImplementation(async (_id, payload) => ({ ...structuredClone(exam), ...payload }));
    mocks.setExamQuestions.mockResolvedValue(structuredClone(exam));
    mocks.updateExamStatus.mockImplementation(async (_id, status) => ({
      ...structuredClone(exam),
      status,
    }));
    mocks.assignStudents.mockResolvedValue([
      {
        id: 'assignment-1',
        examId: 'exam-1',
        studentId: 'student-1',
        student: {
          id: 'student-1',
          email: 'student@oex.test',
          fullName: 'Student One',
        },
      },
    ]);
    mocks.removeAssignment.mockResolvedValue(undefined);
  });

  it('loads and executes the complete draft exam workflow', async () => {
    const wrapper = mount(ExamDetailView, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          LoadingState: { template: '<p>Loading</p>' },
          ErrorState: { props: ['message'], template: '<p>{{ message }}</p>' },
          EmptyState: { props: ['title'], template: '<p>{{ title }}</p>' },
          StatusBadge: { props: ['status'], template: '<span>{{ status }}</span>' },
        },
      },
    });
    await flushPromises();
    const vm = wrapper.vm as unknown as Record<string, any>;

    expect(wrapper.text()).toContain('Midterm');
    expect(mocks.fetchQuestions).toHaveBeenCalledWith({ subjectId: 'subject-1' });
    expect(mocks.fetchStudents).toHaveBeenCalledWith(undefined);

    vm.moveDown(0);
    vm.moveUp(1);
    vm.toggleAllStudents({ target: { checked: true } });
    expect(vm.selectedStudentIds).toEqual(['student-1']);

    vm.detailsForm.title = 'Updated Midterm';
    await vm.saveDetails();
    await vm.saveQuestions();
    await vm.publish();
    await vm.closeExam();
    await vm.assignSelected();
    await vm.removeAssigned('assignment-1');

    expect(mocks.updateExam).toHaveBeenCalledWith(
      'exam-1',
      expect.objectContaining({ title: 'Updated Midterm' }),
    );
    expect(mocks.setExamQuestions).toHaveBeenCalled();
    expect(mocks.updateExamStatus).toHaveBeenCalledWith('exam-1', 'PUBLISHED');
    expect(mocks.updateExamStatus).toHaveBeenCalledWith('exam-1', 'CLOSED');
    expect(mocks.assignStudents).toHaveBeenCalledWith('exam-1', ['student-1']);
    expect(mocks.removeAssignment).toHaveBeenCalledWith('exam-1', 'assignment-1');
  });
});
