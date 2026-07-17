import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyExamAssignment } from '@/types/dashboard';
import {
  formatCountdown,
  getStudentExamAction,
  getStudentExamStatus,
} from '@/utils/studentExam';

const NOW = new Date('2026-07-17T10:00:00.000Z');

function assignment(overrides: Partial<MyExamAssignment> = {}): MyExamAssignment {
  return {
    assignmentId: 'assignment-1',
    exam: {
      id: 'exam-1',
      title: 'Midterm',
      status: 'PUBLISHED',
      durationMinutes: 60,
      openAt: '2026-07-17T09:00:00.000Z',
      closeAt: '2026-07-17T11:00:00.000Z',
    },
    attemptCount: 0,
    maxAttempts: 2,
    hasInProgress: false,
    inProgressAttemptId: null,
    lastCompletedAttemptId: null,
    bestScore: null,
    lastAttemptStatus: null,
    ...overrides,
  };
}

describe('student exam status and actions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('starts an available published exam', () => {
    const item = assignment();

    expect(getStudentExamStatus(item)).toBe('NOT_STARTED');
    expect(getStudentExamAction(item)).toEqual({
      label: 'Start',
      assignmentId: 'assignment-1',
    });
  });

  it('disables Start before the opening time', () => {
    const item = assignment({
      exam: {
        ...assignment().exam,
        openAt: '2026-07-17T11:00:00.000Z',
        closeAt: '2026-07-17T12:00:00.000Z',
      },
    });

    expect(getStudentExamAction(item)).toEqual({
      label: 'Start',
      assignmentId: 'assignment-1',
      disabled: true,
    });
  });

  it('resumes an in-progress attempt', () => {
    const item = assignment({
      hasInProgress: true,
      inProgressAttemptId: 'attempt-running',
    });

    expect(getStudentExamStatus(item)).toBe('IN_PROGRESS');
    expect(getStudentExamAction(item)).toEqual({
      label: 'Resume',
      attemptId: 'attempt-running',
    });
  });

  it('shows a completed result when max attempts are reached', () => {
    const item = assignment({
      attemptCount: 2,
      lastCompletedAttemptId: 'attempt-complete',
      lastAttemptStatus: 'SUBMITTED',
    });

    expect(getStudentExamStatus(item)).toBe('SUBMITTED');
    expect(getStudentExamAction(item)).toEqual({
      label: 'View Result',
      attemptId: 'attempt-complete',
    });
  });

  it('allows another attempt after a submitted attempt when attempts remain', () => {
    const item = assignment({
      attemptCount: 1,
      lastCompletedAttemptId: 'attempt-complete',
      lastAttemptStatus: 'SUBMITTED',
    });

    expect(getStudentExamStatus(item)).toBe('NOT_STARTED');
    expect(getStudentExamAction(item)?.label).toBe('Start');
  });

  it('shows a result after the exam closes', () => {
    const item = assignment({
      exam: { ...assignment().exam, status: 'CLOSED' },
      lastCompletedAttemptId: 'attempt-complete',
    });

    expect(getStudentExamStatus(item)).toBe('CLOSED');
    expect(getStudentExamAction(item)).toEqual({
      label: 'View Result',
      attemptId: 'attempt-complete',
    });
  });

  it('returns no action for a closed exam without a completed attempt', () => {
    const item = assignment({
      exam: {
        ...assignment().exam,
        closeAt: '2026-07-17T09:59:59.000Z',
      },
    });

    expect(getStudentExamStatus(item)).toBe('CLOSED');
    expect(getStudentExamAction(item)).toBeNull();
  });
});

describe('formatCountdown', () => {
  it('formats values below one hour as MM:SS', () => {
    expect(formatCountdown(65)).toBe('01:05');
  });

  it('formats values of one hour or more as HH:MM:SS', () => {
    expect(formatCountdown(3661)).toBe('01:01:01');
  });
});
