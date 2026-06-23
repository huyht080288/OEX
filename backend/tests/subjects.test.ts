import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './setup.js';
import { authHeader, loginAs } from './helpers/auth.js';
import {
  SEED_SUBJECT_ID,
  SEED_SUBJECT_EMPTY_ID,
  SEED_SUBJECT2_ID,
} from '../prisma/seed-data.ts';

describe('Subjects API (Teacher)', () => {
  it('GET /subjects — lists own subjects', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app).get('/api/v1/subjects').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some((s: { id: string }) => s.id === SEED_SUBJECT_ID)).toBe(true);
    expect(res.body.data.some((s: { id: string }) => s.id === SEED_SUBJECT_EMPTY_ID)).toBe(true);
  });

  it('POST /subjects — creates subject', async () => {
    const { token } = await loginAs('teacher');
    const code = `SUB${Date.now()}`;

    const res = await request(app)
      .post('/api/v1/subjects')
      .set(authHeader(token))
      .send({ code, name: 'New Subject', description: 'Test' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ code, name: 'New Subject' });
  });

  it('GET /subjects/:id — returns subject', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get(`/api/v1/subjects/${SEED_SUBJECT_ID}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe('CS101');
  });

  it('PUT /subjects/:id — updates subject', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .put(`/api/v1/subjects/${SEED_SUBJECT_EMPTY_ID}`)
      .set(authHeader(token))
      .send({ name: 'Renamed Empty Subject' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed Empty Subject');
  });

  it('DELETE /subjects/:id — deletes empty subject', async () => {
    const { token } = await loginAs('teacher');
    const code = `DEL${Date.now()}`;

    const createRes = await request(app)
      .post('/api/v1/subjects')
      .set(authHeader(token))
      .send({ code, name: 'To Delete' });

    const res = await request(app)
      .delete(`/api/v1/subjects/${createRes.body.data.id}`)
      .set(authHeader(token));

    expect(res.status).toBe(204);
  });

  it('DELETE /subjects/:id — blocked when questions exist', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .delete(`/api/v1/subjects/${SEED_SUBJECT_ID}`)
      .set(authHeader(token));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /subjects/:id — other teacher receives 403', async () => {
    const { token } = await loginAs('teacher2');

    const res = await request(app)
      .get(`/api/v1/subjects/${SEED_SUBJECT_ID}`)
      .set(authHeader(token));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /subjects/:id — teacher2 can access own subject', async () => {
    const { token } = await loginAs('teacher2');

    const res = await request(app)
      .get(`/api/v1/subjects/${SEED_SUBJECT2_ID}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe('MATH101');
  });

  it('GET /subjects — student receives 403', async () => {
    const { token } = await loginAs('student1');

    const res = await request(app).get('/api/v1/subjects').set(authHeader(token));

    expect(res.status).toBe(403);
  });
});
