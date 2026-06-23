import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './setup.js';
import { authHeader, loginAs } from './helpers/auth.js';
import { SEED_STUDENT1_ID, SEED_STUDENT2_ID } from '../prisma/seed-data.ts';

describe('Students API (Teacher)', () => {
  it('GET /students — lists active students', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app).get('/api/v1/students').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.some((s: { id: string }) => s.id === SEED_STUDENT1_ID)).toBe(true);
    expect(res.body.data.some((s: { id: string }) => s.id === SEED_STUDENT2_ID)).toBe(true);
  });

  it('GET /students?search=student1 — filters by email', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get('/api/v1/students')
      .query({ search: 'student1' })
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].email).toBe('student1@oex.test');
  });

  it('GET /students — student receives 403', async () => {
    const { token } = await loginAs('student1');

    const res = await request(app).get('/api/v1/students').set(authHeader(token));

    expect(res.status).toBe(403);
  });
});
