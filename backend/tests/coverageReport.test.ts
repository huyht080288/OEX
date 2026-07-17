import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './setup.js';

describe('Coverage report', () => {
  it('GET /testcoverage.html serves the navigable coverage viewer', async () => {
    const res = await request(app).get('/testcoverage.html');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('OEX Test Coverage');
    expect(res.text).toContain('Coverage Home');
    expect(res.text).toContain('/coverage/index.html');
  });
});
