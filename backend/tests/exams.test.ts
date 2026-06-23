import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './setup.js';
import { authHeader, loginAs } from './helpers/auth.js';
import {
  SEED_SUBJECT_ID,
  SEED_SUBJECT_EMPTY_ID,
  SEED_QUESTION1_ID,
  SEED_QUESTION2_ID,
  SEED_DRAFT_EXAM_ID,
  SEED_PUBLISHED_EXAM_ID,
  SEED_CLOSED_EXAM_ID,
  SEED_ASSIGNMENT1_ID,
  SEED_STUDENT1_ID,
  SEED_STUDENT2_ID,
} from '../prisma/seed-data.ts';

function examWindow() {
  const openAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const closeAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return { openAt, closeAt };
}

async function createDraftExam(token: string) {
  const { openAt, closeAt } = examWindow();
  const res = await request(app)
    .post('/api/v1/exams')
    .set(authHeader(token))
    .send({
      subjectId: SEED_SUBJECT_ID,
      title: `Draft Exam ${Date.now()}`,
      durationMinutes: 45,
      openAt,
      closeAt,
      maxAttempts: 1,
    });
  return res.body.data;
}

describe('Exams API (Teacher)', () => {
  it('GET /exams — lists own exams', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app).get('/api/v1/exams').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.some((e: { id: string }) => e.id === SEED_PUBLISHED_EXAM_ID)).toBe(true);
  });

  it('POST /exams — creates draft exam', async () => {
    const { token } = await loginAs('teacher');
    const exam = await createDraftExam(token);

    expect(exam.status).toBe('DRAFT');
    expect(exam.title).toContain('Draft Exam');
  });

  it('GET /exams/:id — returns exam with questions and assignments', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get(`/api/v1/exams/${SEED_PUBLISHED_EXAM_ID}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.questions.length).toBeGreaterThanOrEqual(3);
    expect(res.body.data.assignments.length).toBeGreaterThanOrEqual(2);
  });

  it('PUT /exams/:id — updates draft exam', async () => {
    const { token } = await loginAs('teacher');
    const exam = await createDraftExam(token);

    const res = await request(app)
      .put(`/api/v1/exams/${exam.id}`)
      .set(authHeader(token))
      .send({ title: 'Updated Draft Title' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Draft Title');
  });

  it('PUT /exams/:id — cannot update published exam', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .put(`/api/v1/exams/${SEED_PUBLISHED_EXAM_ID}`)
      .set(authHeader(token))
      .send({ title: 'Should Fail' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT /exams/:id/questions — sets question order on draft', async () => {
    const { token } = await loginAs('teacher');
    const exam = await createDraftExam(token);

    const res = await request(app)
      .put(`/api/v1/exams/${exam.id}/questions`)
      .set(authHeader(token))
      .send({ questionIds: [SEED_QUESTION2_ID, SEED_QUESTION1_ID] });

    expect(res.status).toBe(200);
    expect(res.body.data.questions[0].question.id).toBe(SEED_QUESTION2_ID);
    expect(res.body.data.questions[0].orderIndex).toBe(1);
  });

  it('PATCH /exams/:id/status — publishes draft with questions', async () => {
    const { token } = await loginAs('teacher');
    const exam = await createDraftExam(token);

    await request(app)
      .put(`/api/v1/exams/${exam.id}/questions`)
      .set(authHeader(token))
      .send({ questionIds: [SEED_QUESTION1_ID] });

    const res = await request(app)
      .patch(`/api/v1/exams/${exam.id}/status`)
      .set(authHeader(token))
      .send({ status: 'PUBLISHED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PUBLISHED');
  });

  it('PATCH /exams/:id/status — cannot publish without questions', async () => {
    const { token } = await loginAs('teacher');
    const { openAt, closeAt } = examWindow();

    const createRes = await request(app)
      .post('/api/v1/exams')
      .set(authHeader(token))
      .send({
        subjectId: SEED_SUBJECT_EMPTY_ID,
        title: 'Empty Draft',
        durationMinutes: 30,
        openAt,
        closeAt,
      });

    const res = await request(app)
      .patch(`/api/v1/exams/${createRes.body.data.id}/status`)
      .set(authHeader(token))
      .send({ status: 'PUBLISHED' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('at least one question');
  });

  it('PATCH /exams/:id/status — closes published exam', async () => {
    const { token } = await loginAs('teacher');
    const exam = await createDraftExam(token);

    await request(app)
      .put(`/api/v1/exams/${exam.id}/questions`)
      .set(authHeader(token))
      .send({ questionIds: [SEED_QUESTION1_ID] });

    await request(app)
      .patch(`/api/v1/exams/${exam.id}/status`)
      .set(authHeader(token))
      .send({ status: 'PUBLISHED' });

    const res = await request(app)
      .patch(`/api/v1/exams/${exam.id}/status`)
      .set(authHeader(token))
      .send({ status: 'CLOSED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CLOSED');
  });

  it('DELETE /exams/:id — deletes draft only', async () => {
    const { token } = await loginAs('teacher');
    const exam = await createDraftExam(token);

    const res = await request(app)
      .delete(`/api/v1/exams/${exam.id}`)
      .set(authHeader(token));

    expect(res.status).toBe(204);
  });

  it('DELETE /exams/:id — cannot delete published exam', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .delete(`/api/v1/exams/${SEED_PUBLISHED_EXAM_ID}`)
      .set(authHeader(token));

    expect(res.status).toBe(400);
  });

  it('POST /exams/:id/assignments — assigns students', async () => {
    const { token } = await loginAs('teacher');
    const exam = await createDraftExam(token);

    const res = await request(app)
      .post(`/api/v1/exams/${exam.id}/assignments`)
      .set(authHeader(token))
      .send({ studentIds: [SEED_STUDENT1_ID] });

    expect(res.status).toBe(201);
    expect(res.body.data[0].studentId).toBe(SEED_STUDENT1_ID);
  });

  it('POST /exams/:id/assignments — duplicate returns 409', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .post(`/api/v1/exams/${SEED_PUBLISHED_EXAM_ID}/assignments`)
      .set(authHeader(token))
      .send({ studentIds: [SEED_STUDENT1_ID] });

    expect(res.status).toBe(409);
  });

  it('GET /exams/:id/assignments — lists assigned students', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get(`/api/v1/exams/${SEED_PUBLISHED_EXAM_ID}/assignments`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('DELETE /exams/:id/assignments/:assignmentId — removes assignment', async () => {
    const { token } = await loginAs('teacher');
    const exam = await createDraftExam(token);

    const assignRes = await request(app)
      .post(`/api/v1/exams/${exam.id}/assignments`)
      .set(authHeader(token))
      .send({ studentIds: [SEED_STUDENT2_ID] });

    const assignmentId = assignRes.body.data[0].id;

    const res = await request(app)
      .delete(`/api/v1/exams/${exam.id}/assignments/${assignmentId}`)
      .set(authHeader(token));

    expect(res.status).toBe(204);
  });

  it('GET /exams/:id/results — returns attempts summary', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get(`/api/v1/exams/${SEED_PUBLISHED_EXAM_ID}/results`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /exams/:id — seed draft exam is not startable (DRAFT)', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get(`/api/v1/exams/${SEED_DRAFT_EXAM_ID}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DRAFT');
  });

  it('GET /exams/:id — seed closed exam has past window', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get(`/api/v1/exams/${SEED_CLOSED_EXAM_ID}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CLOSED');
    expect(new Date(res.body.data.closeAt).getTime()).toBeLessThan(Date.now());
  });

  it('GET /exams/:id/assignments — includes seed assignment', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get(`/api/v1/exams/${SEED_PUBLISHED_EXAM_ID}/assignments`)
      .set(authHeader(token));

    expect(res.body.data.some((a: { id: string }) => a.id === SEED_ASSIGNMENT1_ID)).toBe(true);
  });
});
