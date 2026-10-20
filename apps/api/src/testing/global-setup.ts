import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    /** A tarball of a freshly migrated database; see createTestContext. */
    pgliteSnapshot: string;
  }
}

/**
 * Runs every migration once for the whole test run and saves the data directory, so a test file loads a
 * migrated database instead of booting PGlite and replaying all migrations itself (about 3 s each).
 */
export default async function setup(project: TestProject) {
  const client = new PGlite();
  await migrate(drizzle(client) as never, {
    migrationsFolder: fileURLToPath(new URL('../../../../packages/db/drizzle', import.meta.url)),
  });
  const dump = await client.dumpDataDir('none');
  await client.close();
  const dir = await mkdtemp(join(tmpdir(), 'harusi-pglite-'));
  const file = join(dir, 'migrated.tar');
  await writeFile(file, Buffer.from(await dump.arrayBuffer()));
  project.provide('pgliteSnapshot', file);
  return () => rm(dir, { recursive: true, force: true });
}
