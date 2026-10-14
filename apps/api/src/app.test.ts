import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@harusi/schemas';
import { api, createTestContext, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await api(ctx, 'GET', '/health');
    expect(res.status).toBe(200);
    expect(healthResponseSchema.parse(res.body).service).toBe('api');
  });

  it('returns the standard error shape for unknown routes', async () => {
    const res = await api(ctx, 'GET', '/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'not_found', message: 'Route not found' } });
  });

  it('requires a bearer token on /v1 routes', async () => {
    const res = await api(ctx, 'GET', '/v1/events');
    expect(res.status).toBe(401);
    expect(res.body?.error.code).toBe('unauthorized');
  });
});
