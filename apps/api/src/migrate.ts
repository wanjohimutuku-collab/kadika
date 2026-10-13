import { fileURLToPath } from 'node:url';
import { runMigrations } from '@harusi/db';

// Release step: `node dist/migrate.js` before starting the API.
// MIGRATIONS_DIR overrides the default location (set in the Docker image).
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const folder =
  process.env.MIGRATIONS_DIR ??
  fileURLToPath(new URL('../../../packages/db/drizzle', import.meta.url));
await runMigrations(url, folder);
console.log(JSON.stringify({ level: 'info', msg: 'migrations applied' }));
