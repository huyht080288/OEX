import { createRouter, createWebHistory } from 'vue-router';
import type { Role } from '@/types/api';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/components/layout/AppLayout.vue';
import LoginView from '@/views/LoginView.vue';
import DashboardView from '@/views/DashboardView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import UserListView from '@/views/admin/UserListView.vue';
import AccountView from '@/views/AccountView.vue';
import SubjectListView from '@/views/teacher/SubjectListView.vue';
import QuestionBankView from '@/views/teacher/QuestionBankView.vue';
import QuestionFormView from '@/views/teacher/QuestionFormView.vue';
import ExamListView from '@/views/teacher/ExamListView.vue';
import ExamNewView from '@/views/teacher/ExamNewView.vue';
import ExamDetailView from '@/views/teacher/ExamDetailView.vue';
import ExamResultsView from '@/views/teacher/ExamResultsView.vue';
import TeacherAttemptDetailView from '@/views/teacher/TeacherAttemptDetailView.vue';
import MyExamsView from '@/views/student/MyExamsView.vue';
import TakeExamView from '@/views/student/TakeExamView.vue';
import ResultView from '@/views/student/ResultView.vue';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    roles?: Role[];
    placeholderTitle?: string;
    placeholderDescription?: string;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/take/:attemptId',
      name: 'take-exam',
      component: TakeExamView,
      meta: { roles: ['STUDENT'] },
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
        },
        {
          path: 'admin/users',
          name: 'admin-users',
          component: UserListView,
          meta: { roles: ['ADMIN'] },
        },
        {
          path: 'account',
          name: 'account',
          component: AccountView,
        },
        {
          path: 'subjects',
          name: 'subjects',
          component: SubjectListView,
          meta: { roles: ['TEACHER'] },
        },
        {
          path: 'subjects/:id/questions',
          name: 'subject-questions',
          component: QuestionBankView,
          meta: { roles: ['TEACHER'] },
        },
        {
          path: 'questions/new',
          name: 'question-new',
          component: QuestionFormView,
          meta: { roles: ['TEACHER'] },
        },
        {
          path: 'questions/:id/edit',
          name: 'question-edit',
          component: QuestionFormView,
          meta: { roles: ['TEACHER'] },
        },
        {
          path: 'exams',
          name: 'exams',
          component: ExamListView,
          meta: { roles: ['TEACHER'] },
        },
        {
          path: 'exams/new',
          name: 'exam-new',
          component: ExamNewView,
          meta: { roles: ['TEACHER'] },
        },
        {
          path: 'exams/:id/results',
          name: 'exam-results',
          component: ExamResultsView,
          meta: { roles: ['TEACHER'] },
        },
        {
          path: 'exams/:id/attempts/:attemptId',
          name: 'exam-attempt-detail',
          component: TeacherAttemptDetailView,
          meta: { roles: ['TEACHER'] },
        },
        {
          path: 'exams/:id',
          name: 'exam-detail',
          component: ExamDetailView,
          meta: { roles: ['TEACHER'] },
        },
        {
          path: 'my-exams',
          name: 'my-exams',
          component: MyExamsView,
          meta: { roles: ['STUDENT'] },
        },
        {
          path: 'results/:attemptId',
          name: 'exam-result',
          component: ResultView,
          meta: { roles: ['STUDENT'] },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.initialized) {
    await auth.initialize();
  }

  if (to.meta.public) {
    if (auth.isAuthenticated && to.name === 'login') {
      return { name: 'dashboard' };
    }
    return true;
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  const roles = to.meta.roles;
  if (roles && auth.user && !roles.includes(auth.user.role)) {
    return { name: 'dashboard' };
  }

  return true;
});

export default router;
