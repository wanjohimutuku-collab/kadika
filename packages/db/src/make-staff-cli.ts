/**
 * Grants or removes Harusi Pass staff access (/ops, ADR 012). Staff are never self-signed-up:
 *   pnpm --filter @harusi/db make-staff +255700000999 admin   (support | billing | admin)
 *   pnpm --filter @harusi/db make-staff +255700000999 remove
 *   pnpm --filter @harusi/db make-staff +255700000999 reset-2fa   (lost phone: set up the app again)
 * The person must have logged in once (the account exists). They sign in again to pick it up, and
 * set up an authenticator app on their first staff sign-in (ADR 040).
 */
import { and, eq, isNull } from 'drizzle-orm';
import { createDb } from './client';
import { refreshTokens, users } from './schema';

const LEVELS = ['support', 'billing', 'admin'] as const;
type Level = (typeof LEVELS)[number];

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const [phoneArg, levelArg = 'support'] = process.argv.slice(2);
const ACTIONS = ['remove', 'reset-2fa'];
if (!phoneArg || (!ACTIONS.includes(levelArg) && !LEVELS.includes(levelArg as Level))) {
  console.error(
    'usage: make-staff <phone e.g. +255712345678 or 0712345678> [support|billing|admin|remove|reset-2fa]',
  );
  process.exit(1);
}
// Local numbers default to Tanzania; anything else must be given in full E.164.
const digits = phoneArg.replace(/[^\d+]/g, '');
const phone = digits.startsWith('+')
  ? digits
  : digits.startsWith('0')
    ? `+255${digits.slice(1)}`
    : `+${digits}`;

// Removing staff or resetting the second factor forgets the authenticator; open sessions end too.
const noAuthenticator = {
  staffTotpSecret: null,
  staffTotpEnrolledAt: null,
  staffTotpLastStep: null,
  staffTotpFailedAttempts: 0,
  staffTotpLockedUntil: null,
};
const { db, pool } = createDb(url);
const [u] = await db
  .update(users)
  .set(
    levelArg === 'remove'
      ? { roleGlobal: 'user', staffRole: null, ...noAuthenticator }
      : levelArg === 'reset-2fa'
        ? noAuthenticator
        : { roleGlobal: 'admin', staffRole: levelArg as Level },
  )
  .where(eq(users.phoneE164, phone))
  .returning({ id: users.id, name: users.name });
if (u && levelArg !== 'support' && levelArg !== 'billing' && levelArg !== 'admin')
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, u.id), isNull(refreshTokens.revokedAt)));
await pool.end();
if (!u) {
  console.error(
    `No account for …${phone.slice(-4)}. Ask them to log in once, then run this again.`,
  );
  process.exit(1);
}
console.log(
  levelArg === 'remove'
    ? `${u.name}: staff access removed`
    : levelArg === 'reset-2fa'
      ? `${u.name}: authenticator removed. They set up a new one at their next sign-in`
      : `${u.name}: staff (${levelArg}). Sign in again, then open /ops`,
);
