import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './setup.js';
import { authHeader, loginAs } from './helpers/auth.js';
import { setAttemptExpired, resetSeedAssignmentAttempts } from './helpers/db.js';
import {
  SEED_ASSIGNMENT1_ID,
  SEED_ASSIGNMENT2_ID,
  SEED_ASSIGNMENT_CLOSED_ID,
  SEED_ATTEMPT_SUBMITTED_ID,
  SEED_ATTEMPT_EXPIRED_ID,
  SEED_PUBLISHED_EXAM_ID,
  SEED_QUESTION1_ID,
  SEED_QUESTION2_ID,
  SEED_QUESTION3_ID,
  SEED_Q1_OPT_B_ID,
  SEED_Q2_OPT_B_ID,
  SEED_Q3_OPT_B_ID,
  SEED_Q2_OPT_A_ID,
  SEED_STUDENT1_ID,
  SEED_STUDENT2_ID,
} from '../prisma/seed-data.ts';

async function startAttempt(token: string, assignmentId: string) {
  return request(app)
    .post('/api/v1/attempts/start')
    .set(authHeader(token))
    .send({ assignmentId });
}

const allCorrectAnswers = [
  { questionId: SEED_QUESTION1_ID, selectedOptionId: SEED_Q1_OPT_B_ID },
  { questionId: SEED_QUESTION2_ID, selectedOptionId: SEED_Q2_OPT_B_ID },
  { questionId: SEED_QUESTION3_ID, selectedOptionId: SEED_Q3_OPT_B_ID },
];

describe('Student exam taking API', () => {
  beforeAll(async () => {
    await resetSeedAssignmentAttempts();
  });

  describe('GET /my-exams', () => {
    it('returns assigned exams with attempt summary', async () => {
      const { token } = await loginAs('student1');

      const res = await request(app).get('/api/v1/my-exams').set(authHeader(token));

      expect(res.status).toBe(200);
      const published = res.body.data.find(
        (a: { exam: { id: string } }) => a.exam.id === SEED_PUBLISHED_EXAM_ID,
      );
      expect(published.assignmentId).toBe(SEED_ASSIGNMENT1_ID);
      expect(published.maxAttempts).toBe(2);
      expect(published.attemptCount).toBeGreaterThanOrEqual(1);
    });

    it('returns 403 for teacher', async () => {
      const { token } = await loginAs('teacher');
      const res = await request(app).get('/api/v1/my-exams').set(authHeader(token));
      expect(res.status).toBe(403);
    });
  });

  describe('POST /attempts/start', () => {
    it('starts attempt and omits isCorrect from options', async () => {
      const { token } = await loginAs('student1');
      const res = await startAttempt(token, SEED_ASSIGNMENT1_ID);

      expect(res.status).toBe(201);
      expect(res.body.data.questions.length).toBeGreaterThanOrEqual(3);
      for (const q of res.body.data.questions) {
        for (const opt of q.options) {
          expect(opt).not.toHaveProperty('isCorrect');
        }
      }
    });

    it('rejects when attempt already in progress', async () => {
      const { token } = await loginAs('student1');
      const res = await startAttempt(token, SEED_ASSIGNMENT1_ID);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ATTEMPT_IN_PROGRESS');
    });

    it('rejects closed exam with EXAM_NOT_AVAILABLE', async () => {
      const { token } = await loginAs('student1');
      const res = await startAttempt(token, SEED_ASSIGNMENT_CLOSED_ID);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXAM_NOT_AVAILABLE');
    });

    it('rejects other student assignment with FORBIDDEN', async () => {
      const { token } = await loginAs('student1');
      const res = await startAttempt(token, SEED_ASSIGNMENT2_ID);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /attempts/:id', () => {
    it('returns in-progress attempt without answer leak', async () => {
      const { token } = await loginAs('student1');
      const listRes = await request(app).get('/api/v1/my-exams').set(authHeader(token));
      const inProgressId = listRes.body.data.find(
        (a: { exam: { id: string } }) => a.exam.id === SEED_PUBLISHED_EXAM_ID,
      )?.inProgressAttemptId;

      const res = await request(app)
        .get(`/api/v1/attempts/${inProgressId}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.questions[0].options[0]).not.toHaveProperty('isCorrect');
    });
  });

  describe('PUT /attempts/:id/answers and POST /submit', () => {
    it('saves answers, submits with correct score, and rejects double submit', async () => {
      const { token } = await loginAs('student1');
      const listRes = await request(app).get('/api/v1/my-exams').set(authHeader(token));
      const attemptId = listRes.body.data.find(
        (a: { exam: { id: string } }) => a.exam.id === SEED_PUBLISHED_EXAM_ID,
      )?.inProgressAttemptId;

      const saveRes = await request(app)
        .put(`/api/v1/attempts/${attemptId}/answers`)
        .set(authHeader(token))
        .send({ answers: allCorrectAnswers });

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.data.answers[SEED_QUESTION1_ID]).toBe(SEED_Q1_OPT_B_ID);

      const submitRes = await request(app)
        .post(`/api/v1/attempts/${attemptId}/submit`)
        .set(authHeader(token));

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.score).toBe(4);
      expect(submitRes.body.data.maxScore).toBe(4);
      expect(submitRes.body.data.correctCount).toBe(3);
      expect(submitRes.body.data.review.length).toBe(3);

      const againRes = await request(app)
        .post(`/api/v1/attempts/${attemptId}/submit`)
        .set(authHeader(token));

      expect(againRes.status).toBe(409);
    });

    it('rejects save after attempt expired', async () => {
      const { token } = await loginAs('student2');

      const startRes = await startAttempt(token, SEED_ASSIGNMENT2_ID);
      const attemptId = startRes.body.data.attemptId;

      await setAttemptExpired(attemptId);

      const res = await request(app)
        .put(`/api/v1/attempts/${attemptId}/answers`)
        .set(authHeader(token))
        .send({
          answers: [{ questionId: SEED_QUESTION1_ID, selectedOptionId: SEED_Q1_OPT_B_ID }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ATTEMPT_EXPIRED');
    });
  });

  describe('GET /attempts/:id/result', () => {
    it('returns seed submitted attempt result with review', async () => {
      const { token } = await loginAs('student2');

      const res = await request(app)
        .get(`/api/v1/attempts/${SEED_ATTEMPT_SUBMITTED_ID}/result`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(2);
      expect(res.body.data.maxScore).toBe(4);
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.review.length).toBe(3);
    });

    it('returns expired attempt result for student1', async () => {
      const { token } = await loginAs('student1');

      const res = await request(app)
        .get(`/api/v1/attempts/${SEED_ATTEMPT_EXPIRED_ID}/result`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('EXPIRED');
      expect(res.body.data.score).toBe(1);
    });

    it('rejects non-in-progress GET for submitted attempt', async () => {
      const { token } = await loginAs('student2');

      const res = await request(app)
        .get(`/api/v1/attempts/${SEED_ATTEMPT_SUBMITTED_ID}`)
        .set(authHeader(token));

      expect(res.status).toBe(400);
    });

    it('rejects access by other student', async () => {
      const { token } = await loginAs('student1');

      const res = await request(app)
        .get(`/api/v1/attempts/${SEED_ATTEMPT_SUBMITTED_ID}/result`)
        .set(authHeader(token));

      expect(res.status).toBe(403);
    });
  });

  describe('MAX_ATTEMPTS_REACHED', () => {
    it('blocks start when no attempts remaining', async () => {
      const { token } = await loginAs('student2');

      const startRes = await startAttempt(token, SEED_ASSIGNMENT2_ID);
      expect(startRes.status).toBe(400);
      expect(startRes.body.error.code).toBe('MAX_ATTEMPTS_REACHED');
    });
  });

  describe('Teacher results view', () => {
    it('teacher can view exam results including student attempts', async () => {
      const { token } = await loginAs('teacher');

      const res = await request(app)
        .get(`/api/v1/exams/${SEED_PUBLISHED_EXAM_ID}/results`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(
        res.body.data.some(
          (r: { studentId: string }) => r.studentId === SEED_STUDENT2_ID,
        ),
      ).toBe(true);
    });

    it('teacher can view attempt detail with answer review', async () => {
      const { token } = await loginAs('teacher');

      const res = await request(app)
        .get(
          `/api/v1/exams/${SEED_PUBLISHED_EXAM_ID}/attempts/${SEED_ATTEMPT_SUBMITTED_ID}`,
        )
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        attemptId: SEED_ATTEMPT_SUBMITTED_ID,
        studentId: SEED_STUDENT2_ID,
      });
      expect(res.body.data.review.length).toBeGreaterThan(0);
      expect(res.body.data.review[0]).toHaveProperty('correctOption');
    });

    it('teacher cannot view attempt detail for another teacher exam', async () => {
      const { token } = await loginAs('teacher2');

      const res = await request(app)
        .get(
          `/api/v1/exams/${SEED_PUBLISHED_EXAM_ID}/attempts/${SEED_ATTEMPT_SUBMITTED_ID}`,
        )
        .set(authHeader(token));

      expect(res.status).toBe(403);
    });
  });
});
