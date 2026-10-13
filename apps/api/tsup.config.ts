import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/migrate.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  // Workspace packages ship as TS source, so bundle them; third-party deps stay external.
  noExternal: [/^@harusi\//],
  // Declared in apps/api/package.json so they are installed in the image.
  external: ['pg', 'uuid', 'drizzle-orm', /^drizzle-orm\//],
});
