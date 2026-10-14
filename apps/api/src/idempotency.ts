import { and, eq } from 'drizzle-orm';
import { idempotencyKeys, newId } from '@harusi/db';
import type { Context, MiddlewareHandler } from 'hono';
import type { Deps } from './context';
import { ApiError } from './errors';

/** Secrets that must never be persisted in the replay store (only hashes are stored, §9). */
const SECRET_FIELDS = ['cardToken'];

function scrub(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const copy: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const f of SECRET_FIELDS) delete copy[f];
  return copy;
}

/**
 * `Idempotency-Key` (§8) for create/import/reissue. The first request runs normally and its 2xx
 * response is stored; a repeat with the same key and the same method+path returns that response
 * (without one-time secrets, flagged `replayed`). The same key on a different request is a 409.
 * Keys are scoped to the signed-in user.
 */
export function idempotent(deps: Deps): MiddlewareHandler<{ Variables: { userId: string } }> {
  return async (c: Context<{ Variables: { userId: string } }>, next) => {
    const key = c.req.header('idempotency-key');
    if (!key) return next();
    if (key.length < 8 || key.length > 128)
      throw new ApiError('validation', 'Idempotency-Key must be 8–128 characters');
    const userId = c.get('userId');
    const fingerprint = `${c.req.method} ${c.req.path}`;
    const [hit] = await deps.db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key)));
    if (hit) {
      if (hit.requestFingerprint !== fingerprint) {
        throw new ApiError('conflict', 'Idempotency-Key was already used for a different request');
      }
      c.header('Idempotent-Replayed', 'true');
      const body =
        hit.responseBody && typeof hit.responseBody === 'object'
          ? { ...(hit.responseBody as object), replayed: true }
          : hit.responseBody;
      return c.json(body as never, hit.responseStatus as 200);
    }
    await next();
    if (c.res.status >= 200 && c.res.status < 300) {
      const stored = scrub(
        await c.res
          .clone()
          .json()
          .catch(() => null),
      );
      await deps.db
        .insert(idempotencyKeys)
        .values({
          id: newId(),
          userId,
          key,
          requestFingerprint: fingerprint,
          responseStatus: c.res.status,
          responseBody: stored as never,
        })
        .onConflictDoNothing();
    }
  };
}
