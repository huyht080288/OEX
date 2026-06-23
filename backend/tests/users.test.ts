import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './setup.js';
import { authHeader, loginAs } from './helpers/auth.js';
import {
  SEED_STUDENT1_ID,
  SEED_STUDENT2_ID,
  SEED_TEACHER_ID,
  SEED_USERS,
} from '../prisma/seed-data.ts';

describe('Users API (Admin)', () => {
  it('GET /users — admin can list users', async () => {
    const { token } = await loginAs('admin');

    const res = await request(app).get('/api/v1/users').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
  });

  it('GET /users?role=STUDENT — filters by role', async () => {
    const { token } = await loginAs('admin');

    const res = await request(app)
      .get('/api/v1/users')
      .query({ role: 'STUDENT' })
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.every((u: { role: string }) => u.role === 'STUDENT')).toBe(true);
    expect(res.body.data.some((u: { id: string }) => u.id === SEED_STUDENT1_ID)).toBe(true);
    expect(res.body.data.some((u: { id: string }) => u.id === SEED_STUDENT2_ID)).toBe(true);
  });

  it('GET /users?search=teacher — filters by email or name', async () => {
    const { token } = await loginAs('admin');

    const res = await request(app)
      .get('/api/v1/users')
      .query({ search: 'teacher' })
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.some((u: { email: string }) => u.email === SEED_USERS.teacher.email)).toBe(
      true,
    );
  });

  it('POST /users — admin creates user', async () => {
    const { token } = await loginAs('admin');
    const email = `new-student-${Date.now()}@oex.test`;

    const res = await request(app)
      .post('/api/v1/users')
      .set(authHeader(token))
      .send({
        email,
        password: 'Password123!',
        fullName: 'New Student',
        role: 'STUDENT',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      email,
      fullName: 'New Student',
      role: 'STUDENT',
      isActive: true,
    });
  });

  it('POST /users — duplicate email returns 400', async () => {
    const { token } = await loginAs('admin');

    const res = await request(app)
      .post('/api/v1/users')
      .set(authHeader(token))
      .send({
        email: SEED_USERS.admin.email,
        password: 'Password123!',
        fullName: 'Duplicate',
        role: 'ADMIN',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /users/:id — returns user by id', async () => {
    const { token } = await loginAs('admin');

    const res = await request(app)
      .get(`/api/v1/users/${SEED_TEACHER_ID}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(SEED_USERS.teacher.email);
  });

  it('GET /users/:id — not found returns 404', async () => {
    const { token } = await loginAs('admin');

    const res = await request(app)
      .get('/api/v1/users/00000000-0000-4000-8000-000000009999')
      .set(authHeader(token));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PUT /users/:id — updates user', async () => {
    const { token } = await loginAs('admin');
    const email = `update-${Date.now()}@oex.test`;

    const createRes = await request(app)
      .post('/api/v1/users')
      .set(authHeader(token))
      .send({
        email,
        password: 'Password123!',
        fullName: 'Before Update',
        role: 'STUDENT',
      });

    const userId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/v1/users/${userId}`)
      .set(authHeader(token))
      .send({ fullName: 'After Update' });

    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe('After Update');
  });

  it('PATCH /users/:id/status — deactivates user', async () => {
    const { token } = await loginAs('admin');
    const email = `deactivate-${Date.now()}@oex.test`;

    const createRes = await request(app)
      .post('/api/v1/users')
      .set(authHeader(token))
      .send({
        email,
        password: 'Password123!',
        fullName: 'To Deactivate',
        role: 'STUDENT',
      });

    const userId = createRes.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/users/${userId}/status`)
      .set(authHeader(token))
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('GET /users — student receives 403', async () => {
    const { token } = await loginAs('student1');

    const res = await request(app).get('/api/v1/users').set(authHeader(token));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /users — unauthenticated receives 401', async () => {
    const res = await request(app).get('/api/v1/users');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
