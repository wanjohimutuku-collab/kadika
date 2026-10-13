import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@harusi/schemas';
import { createApp } from './app';

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await createApp().request('/health');
    expect(res.status).toBe(200);
    expect(healthResponseSchema.parse(await res.json()).service).toBe('api');
  });

  it('returns the standard error shape for unknown routes', async () => {
    const res = await createApp().request('/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'not_found', message: 'Route not found' } });
  });
});
