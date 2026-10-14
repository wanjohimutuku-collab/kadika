import { healthResponseSchema, type HealthResponse } from '@harusi/schemas';

export * from './types';
export * from './errors';
export type { Repository } from './repository';
export * from './domain/pledge';
export * from './domain/sms';
export * from './domain/funnel';
export * from './domain/guest-filter';
export * from '@harusi/schemas/import';
export * from './domain/token';
export {
  createHttpRepository,
  fetchCardPreview,
  memoryTokenStore,
  webStorageTokenStore,
  type TokenStore,
  type HttpRepositoryOptions,
} from './http-repository';

/** Minimal health client (Phase 0). */
export function createApiClient(baseUrl: string, fetchImpl: typeof fetch = fetch) {
  return {
    async health(): Promise<HealthResponse> {
      const res = await fetchImpl(`${baseUrl}/health`);
      if (!res.ok) throw new Error(`health check failed: ${res.status}`);
      return healthResponseSchema.parse(await res.json());
    },
  };
}
