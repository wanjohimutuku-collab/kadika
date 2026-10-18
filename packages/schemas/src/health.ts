import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  time: z.string(),
  // The commit the running image was built from ('dev' outside a release build).
  // Optional so clients still accept an older server.
  version: z.string().optional(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
