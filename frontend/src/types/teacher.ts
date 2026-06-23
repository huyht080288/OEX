export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOption {
  id?: string;
  label: string;
  content: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  subjectId: string;
  content: string;
  difficulty: Difficulty;
  points: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  options: QuestionOption[];
}

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  openAt: string;
  closeAt: string;
  maxAttempts: number;
  showAnswersAfterSubmit: boolean;
  status: ExamStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  questions?: ExamQuestion[];
  assignments?: ExamAssignment[];
}

export interface ExamQuestion {
  orderIndex: number;
  question: {
    id: string;
    content: string;
    difficulty: Difficulty;
    points: number;
    options: QuestionOption[];
  };
}

export interface ExamAssignment {
  id: string;
  studentId: string;
  student: {
    id: string;
    email: string;
    fullName: string;
  };
  assignedAt: string;
}

export interface StudentSummary {
  id: string;
  email: string;
  fullName: string;
}

export interface ExamResultRow {
  attemptId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: string;
  score: number | null;
  maxScore: number;
  startedAt: string;
  submittedAt: string | null;
}

export interface TeacherAttemptReviewItem {
  questionId: string;
  content: string;
  selectedOptionId: string | null;
  selectedOption: { id: string; label: string; content: string } | null;
  correctOptionId: string | null;
  correctOption: { id: string; label: string; content: string } | null;
  isCorrect: boolean;
  points: number;
}

export interface TeacherAttemptResult {
  attemptId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string | null;
  review: TeacherAttemptReviewItem[];
}

export interface CreateSubjectPayload {
  code: string;
  name: string;
  description?: string;
}

export interface CreateQuestionPayload {
  subjectId: string;
  content: string;
  difficulty: Difficulty;
  points: number;
  options: QuestionOption[];
}

export interface CreateExamPayload {
  subjectId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  openAt: string;
  closeAt: string;
  maxAttempts: number;
  showAnswersAfterSubmit: boolean;
}
