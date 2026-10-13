import { describe, expect, it } from 'vitest';
import { createApiClient } from './index';

describe('api client', () => {
  it('parses a health response', async () => {
    const fake = (async () =>
      new Response(JSON.stringify({ status: 'ok', service: 'api', time: 't' }))) as typeof fetch;
    const res = await createApiClient('http://x', fake).health();
    expect(res.status).toBe('ok');
  });
});
