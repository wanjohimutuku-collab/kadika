import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/migrate.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  // Workspace packages ship as TS source, so bundle them; third-party deps stay external.
  noExternal: [/^@harusi\//],
  // Declared in apps/api/package.json so they are installed in the image.
  // sharp is a native module (Kumbukumbu photos, ADR 050): it can never be bundled.
  external: ['pg', 'uuid', 'drizzle-orm', /^drizzle-orm\//, 'sharp'],
});
