import type { MyExamAssignment } from '@/types/dashboard';
import type { StudentExamAction, StudentExamDisplayStatus } from '@/types/student';

export function getStudentExamStatus(item: MyExamAssignment): StudentExamDisplayStatus {
  const now = Date.now();
  const openAt = new Date(item.exam.openAt).getTime();
  const closeAt = new Date(item.exam.closeAt).getTime();

  if (item.exam.status === 'CLOSED' || now > closeAt) {
    return 'CLOSED';
  }
  if (item.hasInProgress) {
    return 'IN_PROGRESS';
  }
  if (item.attemptCount >= item.maxAttempts && item.lastCompletedAttemptId) {
    return 'SUBMITTED';
  }
  if (
    item.lastAttemptStatus === 'SUBMITTED' ||
    item.lastAttemptStatus === 'EXPIRED'
  ) {
    if (item.attemptCount < item.maxAttempts && now >= openAt) {
      return 'NOT_STARTED';
    }
    return 'SUBMITTED';
  }
  return 'NOT_STARTED';
}

export function getStudentExamAction(item: MyExamAssignment): StudentExamAction | null {
  const status = getStudentExamStatus(item);
  const now = Date.now();
  const openAt = new Date(item.exam.openAt).getTime();
  const canTake = now >= openAt && item.exam.status === 'PUBLISHED';

  if (status === 'IN_PROGRESS' && item.inProgressAttemptId) {
    return { label: 'Resume', attemptId: item.inProgressAttemptId };
  }
  if (status === 'SUBMITTED' && item.lastCompletedAttemptId) {
    return { label: 'View Result', attemptId: item.lastCompletedAttemptId };
  }
  if (status === 'CLOSED' && item.lastCompletedAttemptId) {
    return { label: 'View Result', attemptId: item.lastCompletedAttemptId };
  }
  if (status === 'NOT_STARTED' && canTake && item.attemptCount < item.maxAttempts) {
    return { label: 'Start', assignmentId: item.assignmentId };
  }
  if (status === 'NOT_STARTED' && !canTake) {
    return { label: 'Start', assignmentId: item.assignmentId, disabled: true };
  }
  return null;
}

export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}
