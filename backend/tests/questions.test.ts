import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './setup.js';
import { authHeader, loginAs } from './helpers/auth.js';
import {
  SEED_SUBJECT_ID,
  SEED_SUBJECT2_ID,
  SEED_QUESTION1_ID,
} from '../prisma/seed-data.ts';

const validOptions = [
  { label: 'A', content: 'Alpha', isCorrect: false },
  { label: 'B', content: 'Beta', isCorrect: true },
  { label: 'C', content: 'Gamma', isCorrect: false },
];

describe('Questions API (Teacher)', () => {
  it('GET /questions — lists questions for own subjects', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app).get('/api/v1/questions').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /questions?subjectId= — filters by subject', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get('/api/v1/questions')
      .query({ subjectId: SEED_SUBJECT_ID })
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.every((q: { subjectId: string }) => q.subjectId === SEED_SUBJECT_ID)).toBe(
      true,
    );
  });

  it('GET /questions?q=France — filters by content', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get('/api/v1/questions')
      .query({ q: 'France' })
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.some((q: { id: string }) => q.id === SEED_QUESTION1_ID)).toBe(true);
  });

  it('POST /questions — creates question with one correct option', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .post('/api/v1/questions')
      .set(authHeader(token))
      .send({
        subjectId: SEED_SUBJECT_ID,
        content: 'New test question?',
        difficulty: 'EASY',
        points: 1,
        options: validOptions,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.options.filter((o: { isCorrect: boolean }) => o.isCorrect)).toHaveLength(1);
  });

  it('POST /questions — two correct options returns 400', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .post('/api/v1/questions')
      .set(authHeader(token))
      .send({
        subjectId: SEED_SUBJECT_ID,
        content: 'Bad question?',
        difficulty: 'EASY',
        points: 1,
        options: [
          { label: 'A', content: 'A', isCorrect: true },
          { label: 'B', content: 'B', isCorrect: true },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('exactly one correct');
  });

  it('POST /questions — zero correct options returns 400', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .post('/api/v1/questions')
      .set(authHeader(token))
      .send({
        subjectId: SEED_SUBJECT_ID,
        content: 'No correct?',
        difficulty: 'EASY',
        points: 1,
        options: [
          { label: 'A', content: 'A', isCorrect: false },
          { label: 'B', content: 'B', isCorrect: false },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /questions/:id — includes isCorrect for teacher', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get(`/api/v1/questions/${SEED_QUESTION1_ID}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.options.some((o: { isCorrect: boolean }) => o.isCorrect === true)).toBe(
      true,
    );
  });

  it('PUT /questions/:id — updates question', async () => {
    const { token } = await loginAs('teacher');

    const createRes = await request(app)
      .post('/api/v1/questions')
      .set(authHeader(token))
      .send({
        subjectId: SEED_SUBJECT_ID,
        content: 'Update me?',
        difficulty: 'MEDIUM',
        points: 2,
        options: validOptions,
      });

    const questionId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/v1/questions/${questionId}`)
      .set(authHeader(token))
      .send({ content: 'Updated content' });

    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('Updated content');
  });

  it('DELETE /questions/:id — deletes question', async () => {
    const { token } = await loginAs('teacher');

    const createRes = await request(app)
      .post('/api/v1/questions')
      .set(authHeader(token))
      .send({
        subjectId: SEED_SUBJECT_ID,
        content: 'Delete me?',
        difficulty: 'EASY',
        points: 1,
        options: validOptions,
      });

    const res = await request(app)
      .delete(`/api/v1/questions/${createRes.body.data.id}`)
      .set(authHeader(token));

    expect(res.status).toBe(204);
  });

  it('POST /questions — other teacher subject returns 403', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .post('/api/v1/questions')
      .set(authHeader(token))
      .send({
        subjectId: SEED_SUBJECT2_ID,
        content: 'Not yours',
        difficulty: 'EASY',
        points: 1,
        options: validOptions,
      });

    expect(res.status).toBe(403);
  });
});
