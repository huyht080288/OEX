import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './setup.js';
import { loginAs, loginWithCredentials } from './helpers/auth.js';
import { SEED_PASSWORD, SEED_USERS } from '../prisma/seed-data.ts';

describe('Auth API', () => {
  it('POST /auth/login — valid credentials returns JWT and user', async () => {
    const res = await loginWithCredentials(SEED_USERS.student1.email, SEED_PASSWORD);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.expiresIn).toBeGreaterThan(0);
    expect(res.body.data.user).toMatchObject({
      email: SEED_USERS.student1.email,
      fullName: SEED_USERS.student1.fullName,
      role: 'STUDENT',
    });
  });

  it('POST /auth/login — wrong password returns 401 INVALID_CREDENTIALS', async () => {
    const res = await loginWithCredentials(SEED_USERS.admin.email, 'wrong-password');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /auth/login — inactive user returns 403 ACCOUNT_INACTIVE', async () => {
    const res = await loginWithCredentials(SEED_USERS.inactive.email, SEED_PASSWORD);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('POST /auth/login — invalid email format returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /auth/me — returns current user profile', async () => {
    const { token } = await loginAs('teacher');

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      email: SEED_USERS.teacher.email,
      role: 'TEACHER',
    });
  });

  it('GET /auth/me — missing token returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /auth/me — invalid token returns 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /auth/change-password — updates password when current password is correct', async () => {
    const email = `pwd-change-${Date.now()}@oex.test`;
    const { token: adminToken } = await loginAs('admin');

    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email,
        password: 'OldPassword1!',
        fullName: 'Pwd Change User',
        role: 'STUDENT',
      });

    const loginRes = await loginWithCredentials(email, 'OldPassword1!');
    const token = loginRes.body.data.accessToken as string;

    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'OldPassword1!', newPassword: 'NewPassword1!' });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);

    const oldLogin = await loginWithCredentials(email, 'OldPassword1!');
    expect(oldLogin.status).toBe(401);

    const newLogin = await loginWithCredentials(email, 'NewPassword1!');
    expect(newLogin.status).toBe(200);
  });

  it('POST /auth/change-password — wrong current password returns 400', async () => {
    const { token } = await loginAs('student1');

    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong-password', newPassword: 'NewPassword1!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /auth/change-password — requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: 'x', newPassword: 'NewPassword1!' });

    expect(res.status).toBe(401);
  });
});
