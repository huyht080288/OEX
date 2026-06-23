export interface AttemptQuestion {
  id: string;
  orderIndex: number;
  content: string;
  points: number;
  options: { id: string; label: string; content: string }[];
}

export interface InProgressAttempt {
  attemptId: string;
  examTitle: string;
  expiresAt: string;
  questions: AttemptQuestion[];
  answers: Record<string, string | null>;
}

export interface AttemptReviewItem {
  questionId: string;
  content: string;
  selectedOptionId: string | null;
  selectedOption: { id: string; label: string; content: string } | null;
  correctOptionId: string | null;
  correctOption: { id: string; label: string; content: string } | null;
  isCorrect: boolean;
  points: number;
}

export interface AttemptResult {
  attemptId: string;
  examTitle: string;
  status: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string | null;
  review: AttemptReviewItem[];
}

export type StudentExamDisplayStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'CLOSED';

export interface StudentExamAction {
  label: 'Start' | 'Resume' | 'View Result';
  disabled?: boolean;
  attemptId?: string;
  assignmentId?: string;
}
