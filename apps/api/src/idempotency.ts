import { and, eq, lt } from 'drizzle-orm';
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

/** `response_status` of a key whose first request is still running (no real status is 0). */
const IN_FLIGHT = 0;
/** A claim this old belongs to a request that died (a crash or a restart mid-request). */
const ABANDONED_AFTER_MS = 15 * 60_000;

/**
 * `Idempotency-Key` (§8) for create/import/reissue/send. The key is claimed BEFORE the request runs, so
 * a retry that arrives while the first is still running (a slow send behind a proxy timeout, a double
 * tap) gets a 409 instead of running the work twice. A finished 2xx is stored and replayed (without
 * one-time secrets, flagged `replayed`); anything else frees the key for a retry. The same key on a
 * different request is a 409. Keys are scoped to the signed-in user.
 */
export function idempotent(deps: Deps): MiddlewareHandler<{ Variables: { userId: string } }> {
  return async (c: Context<{ Variables: { userId: string } }>, next) => {
    const key = c.req.header('idempotency-key');
    if (!key) return next();
    if (key.length < 8 || key.length > 128)
      throw new ApiError('validation', 'Idempotency-Key must be 8–128 characters');
    const userId = c.get('userId');
    const fingerprint = `${c.req.method} ${c.req.path}`;
    const mine = and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key));
    // A claim left behind by a request that never finished is released, so the key works again.
    await deps.db
      .delete(idempotencyKeys)
      .where(
        and(
          mine,
          eq(idempotencyKeys.responseStatus, IN_FLIGHT),
          lt(idempotencyKeys.createdAt, new Date(deps.now().getTime() - ABANDONED_AFTER_MS)),
        ),
      );
    const id = newId();
    const claimed = await deps.db
      .insert(idempotencyKeys)
      .values({
        id,
        userId,
        key,
        requestFingerprint: fingerprint,
        responseStatus: IN_FLIGHT,
        createdAt: deps.now(),
      })
      .onConflictDoNothing()
      .returning({ id: idempotencyKeys.id });
    if (claimed.length === 0) {
      const [hit] = await deps.db.select().from(idempotencyKeys).where(mine);
      if (!hit) throw new ApiError('conflict', 'Idempotency-Key is in use, retry shortly');
      if (hit.requestFingerprint !== fingerprint) {
        throw new ApiError('conflict', 'Idempotency-Key was already used for a different request');
      }
      if (hit.responseStatus === IN_FLIGHT)
        throw new ApiError(
          'conflict',
          'The first request with this Idempotency-Key is still running',
          {
            reason: 'in_progress',
            retryAfterSeconds: 5,
          },
        );
      c.header('Idempotent-Replayed', 'true');
      const body =
        hit.responseBody && typeof hit.responseBody === 'object'
          ? { ...(hit.responseBody as object), replayed: true }
          : hit.responseBody;
      return c.json(body as never, hit.responseStatus as 200);
    }
    const release = () => deps.db.delete(idempotencyKeys).where(eq(idempotencyKeys.id, id));
    try {
      await next();
    } catch (e) {
      await release();
      throw e;
    }
    // Hono turns a thrown error into a response before the middleware sees it, so check the status too.
    if (c.res.status >= 200 && c.res.status < 300 && !c.error) {
      const stored = scrub(
        await c.res
          .clone()
          .json()
          .catch(() => null),
      );
      await deps.db
        .update(idempotencyKeys)
        .set({ responseStatus: c.res.status, responseBody: stored as never })
        .where(eq(idempotencyKeys.id, id));
    } else await release();
  };
}
