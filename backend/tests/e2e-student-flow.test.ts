import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from './setup.js';
import { authHeader, loginAs } from './helpers/auth.js';
import { resetSeedAssignmentAttempts } from './helpers/db.js';
import {
  SEED_ASSIGNMENT2_ID,
  SEED_PUBLISHED_EXAM_ID,
  SEED_QUESTION1_ID,
  SEED_QUESTION2_ID,
  SEED_QUESTION3_ID,
  SEED_Q1_OPT_B_ID,
  SEED_Q2_OPT_B_ID,
  SEED_Q3_OPT_B_ID,
} from '../prisma/seed-data.ts';

/**
 * End-to-end API flow (design §7 UC-07 / §7 UC-08):
 * login → list assigned exams → start attempt → save answers → submit → view result.
 */
describe('E2E — student exam flow', () => {
  beforeAll(async () => {
    await resetSeedAssignmentAttempts();
  });

  it('login → my-exams → start → save → submit → result', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student2@oex.test', password: 'Password123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.role).toBe('STUDENT');
    const token = loginRes.body.data.accessToken as string;

    const myExamsRes = await request(app).get('/api/v1/my-exams').set(authHeader(token));
    expect(myExamsRes.status).toBe(200);
    const assignment = myExamsRes.body.data.find(
      (a: { exam: { id: string } }) => a.exam.id === SEED_PUBLISHED_EXAM_ID,
    );
    expect(assignment.assignmentId).toBe(SEED_ASSIGNMENT2_ID);
    expect(assignment.exam.subjectName).toBeTruthy();

    const startRes = await request(app)
      .post('/api/v1/attempts/start')
      .set(authHeader(token))
      .send({ assignmentId: SEED_ASSIGNMENT2_ID });

    expect(startRes.status).toBe(201);
    expect(startRes.body.data.examTitle).toBeTruthy();
    const attemptId = startRes.body.data.attemptId as string;
    expect(startRes.body.data.questions.length).toBeGreaterThanOrEqual(3);
    for (const q of startRes.body.data.questions) {
      for (const opt of q.options) {
        expect(opt).not.toHaveProperty('isCorrect');
      }
    }

    const getRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}`)
      .set(authHeader(token));
    expect(getRes.status).toBe(200);

    const answers = [
      { questionId: SEED_QUESTION1_ID, selectedOptionId: SEED_Q1_OPT_B_ID },
      { questionId: SEED_QUESTION2_ID, selectedOptionId: SEED_Q2_OPT_B_ID },
      { questionId: SEED_QUESTION3_ID, selectedOptionId: SEED_Q3_OPT_B_ID },
    ];

    const saveRes = await request(app)
      .put(`/api/v1/attempts/${attemptId}/answers`)
      .set(authHeader(token))
      .send({ answers });
    expect(saveRes.status).toBe(200);

    const submitRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set(authHeader(token));
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.score).toBe(4);
    expect(submitRes.body.data.maxScore).toBe(4);
    expect(submitRes.body.data.correctCount).toBe(3);
    expect(submitRes.body.data.review.length).toBe(3);
    expect(submitRes.body.data.review[0].correctOption).toBeTruthy();

    const resultRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}/result`)
      .set(authHeader(token));
    expect(resultRes.status).toBe(200);
    expect(resultRes.body.data.status).toBe('SUBMITTED');
    expect(resultRes.body.data.score).toBe(4);
    expect(resultRes.body.data.examTitle).toBeTruthy();
  });

  it('rejects unauthenticated access to my-exams', async () => {
    const res = await request(app).get('/api/v1/my-exams');
    expect(res.status).toBe(401);
  });
});
