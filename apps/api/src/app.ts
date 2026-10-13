import { Hono } from 'hono';
import type { HealthResponse } from '@harusi/schemas';

export function createApp() {
  const app = new Hono();

  app.get('/health', (c) => {
    const body: HealthResponse = { status: 'ok', service: 'api', time: new Date().toISOString() };
    return c.json(body);
  });

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404));
  app.onError((err, c) => {
    console.error(JSON.stringify({ level: 'error', msg: err.message }));
    return c.json({ error: { code: 'internal', message: 'Internal server error' } }, 500);
  });

  return app;
}
