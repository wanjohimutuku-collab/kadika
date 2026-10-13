export type RepositoryErrorCode =
  | 'offline'
  | 'not_found'
  | 'invalid_token'
  | 'reissued'
  | 'rate_limited'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'locked'
  | 'server'
  | 'not_implemented';

/** Mirrors the API error shape `{ error: { code, message, details? } }` (§8). */
export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: RepositoryErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message ?? code);
    this.name = 'RepositoryError';
    this.code = code;
    this.details = details;
  }
}

export function isRepositoryError(e: unknown): e is RepositoryError {
  return (
    e instanceof RepositoryError ||
    (typeof e === 'object' && e !== null && (e as { name?: string }).name === 'RepositoryError')
  );
}

export function errorCode(e: unknown): RepositoryErrorCode {
  return isRepositoryError(e) ? e.code : 'server';
}
