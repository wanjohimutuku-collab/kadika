import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

/** Applies SQL migrations from `migrationsFolder`. Used as the release step before API start. */
export async function runMigrations(connectionString: string, migrationsFolder: string) {
  const pool = new pg.Pool({ connectionString });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}
