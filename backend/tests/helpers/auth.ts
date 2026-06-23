import request from 'supertest';
import { app } from '../setup.js';
import { SEED_PASSWORD, SEED_USERS } from '../../prisma/seed-data.ts';
import { Role } from '@prisma/client';

type SeedKey = keyof typeof SEED_USERS;

export async function loginAs(role: SeedKey | 'admin' | 'teacher' | 'teacher2' | 'student1' | 'student2') {
  const user = SEED_USERS[role as SeedKey];
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: SEED_PASSWORD });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${user.email}: ${JSON.stringify(res.body)}`);
  }

  return {
    token: res.body.data.accessToken as string,
    user: res.body.data.user,
  };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function loginWithCredentials(email: string, password: string) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

export { Role };
