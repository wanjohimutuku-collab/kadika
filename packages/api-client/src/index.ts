import { healthResponseSchema, type HealthResponse } from '@harusi/schemas';

// Phase 0 stub. Later replaced by a client generated from the OpenAPI spec.
export function createApiClient(baseUrl: string, fetchImpl: typeof fetch = fetch) {
  return {
    async health(): Promise<HealthResponse> {
      const res = await fetchImpl(`${baseUrl}/health`);
      if (!res.ok) throw new Error(`health check failed: ${res.status}`);
      return healthResponseSchema.parse(await res.json());
    },
  };
}
