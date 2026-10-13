import { RepositoryError } from './errors';
import type { Repository } from './repository';

/**
 * Placeholder for the real `/v1` client (Phases 1–6). Every method throws `not_implemented` until
 * the API exists; the shape is enforced by `Repository`, so swapping it in is a one-line change.
 */
export function createHttpRepository(baseUrl: string): Repository {
  return new Proxy({} as Repository, {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      return () =>
        Promise.reject(
          new RepositoryError(
            'not_implemented',
            `HttpRepository.${String(prop)} → ${baseUrl}/v1 (not built yet)`,
          ),
        );
    },
  });
}
