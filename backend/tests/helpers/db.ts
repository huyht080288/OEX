import { prisma } from '../../src/lib/prisma.js';
import {
  SEED_ASSIGNMENT1_ID,
  SEED_ASSIGNMENT2_ID,
  SEED_ATTEMPT_EXPIRED_ID,
  SEED_ATTEMPT_SUBMITTED_ID,
} from '../../prisma/seed-data.ts';

export async function setAttemptExpired(attemptId: string) {
  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
}

/** Remove stray attempts from prior test runs; keep stable seed attempts. */
export async function resetSeedAssignmentAttempts() {
  await prisma.examAttempt.deleteMany({
    where: {
      assignmentId: { in: [SEED_ASSIGNMENT1_ID, SEED_ASSIGNMENT2_ID] },
      id: { notIn: [SEED_ATTEMPT_SUBMITTED_ID, SEED_ATTEMPT_EXPIRED_ID] },
    },
  });
}
