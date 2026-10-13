import { serve } from '@hono/node-server';
import { createApp } from './app';

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);

serve({ fetch: createApp().fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(JSON.stringify({ level: 'info', msg: 'api listening', port: info.port }));
});
