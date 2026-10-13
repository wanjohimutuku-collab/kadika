import { fileURLToPath } from 'node:url';
import { runMigrations } from './migrate';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
await runMigrations(url, fileURLToPath(new URL('../drizzle', import.meta.url)));
console.log('migrations applied');
