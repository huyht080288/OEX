import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './setup.js';

describe('Swagger docs', () => {
  it('GET /api/docs serves Swagger UI', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text.toLowerCase()).toContain('swagger');
  });

  it('GET /api/openapi.yaml returns the OpenAPI spec', async () => {
    const res = await request(app).get('/api/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/yaml/);
    expect(res.text).toContain('openapi: 3.0.3');
    expect(res.text).toContain('OEX API');
  });
});
