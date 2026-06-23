import type { Role } from './api';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamSummary {
  id: string;
  subjectId: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  openAt: string;
  closeAt: string;
  maxAttempts: number;
  showAnswersAfterSubmit: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyExamAssignment {
  assignmentId: string;
  exam: {
    id: string;
    title: string;
    subjectName?: string;
    status: string;
    durationMinutes: number;
    openAt: string;
    closeAt: string;
  };
  attemptCount: number;
  maxAttempts: number;
  hasInProgress: boolean;
  inProgressAttemptId: string | null;
  lastCompletedAttemptId: string | null;
  bestScore: number | null;
  lastAttemptStatus: string | null;
}

export interface DashboardStats {
  role: Role;
  totalUsers?: number;
  subjectCount?: number;
  activeExamCount?: number;
  upcomingExams?: MyExamAssignment[];
  recentScores?: { title: string; score: number }[];
}
