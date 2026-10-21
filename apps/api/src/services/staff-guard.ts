import { eq } from 'drizzle-orm';
import { users } from '@harusi/db';
import type { Db } from '@harusi/db';
import { ApiError } from '../errors';

/**
 * Who is calling a staff route: the user and whether their access token was issued after the staff
 * second factor (the `mfa` claim, ADR 040).
 */
export interface StaffCaller {
  userId: string;
  mfa: boolean;
}

/** Staff data is only for sessions that passed the authenticator step (ADR 040, finding H-01). */
function requireSecondFactor(caller: StaffCaller) {
  if (!caller.mfa)
    throw new ApiError('forbidden', 'Second factor required', {
      reason: 'second_factor_required',
    });
}

/**
 * Settings hold provider secrets and the public brand, so only admin staff may read or change them
 * (ADR 031, 036): an active user with `role_global = admin` and `staff_role = admin`. Support and billing
 * staff get `missing_permission: settings`; staff without the second factor get
 * `second_factor_required`; everyone else gets a plain refusal.
 */
export async function requireSettingsAdmin(db: Db, caller: StaffCaller): Promise<void> {
  const [u] = await db
    .select({ role: users.roleGlobal, staffRole: users.staffRole, status: users.status })
    .from(users)
    .where(eq(users.id, caller.userId));
  if (!u || u.role !== 'admin' || u.status !== 'active')
    throw new ApiError('forbidden', 'Staff only');
  requireSecondFactor(caller);
  if (u.staffRole !== 'admin')
    throw new ApiError('forbidden', 'missing_permission', { permission: 'settings' });
}

export type StaffRole = 'support' | 'billing' | 'admin';
export type StaffPermission = 'read' | 'lookup' | 'reveal' | 'requests' | 'plan' | 'suspend';

/** Same table as `STAFF_PERMISSIONS` in the api-client (ADR 012). Aggregate reads are open to all staff. */
const STAFF_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  support: ['read', 'lookup', 'reveal', 'requests'],
  billing: ['read', 'plan'],
  admin: ['read', 'lookup', 'reveal', 'requests', 'plan', 'suspend'],
};

/**
 * The /ops pages (ADR 012): an active user with `role_global = admin`; a staff member without a level
 * counts as support, as in `/v1/me`, and the session must have passed the second factor. Missing the level for an action gives `missing_permission`.
 */
export async function requireStaff(
  db: Db,
  caller: StaffCaller,
  permission: StaffPermission = 'read',
): Promise<{ id: string; name: string; phoneE164: string }> {
  const [u] = await db
    .select({
      id: users.id,
      name: users.name,
      phoneE164: users.phoneE164,
      role: users.roleGlobal,
      staffRole: users.staffRole,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, caller.userId));
  if (!u || u.role !== 'admin' || u.status !== 'active')
    throw new ApiError('forbidden', 'Staff only');
  requireSecondFactor(caller);
  if (!STAFF_PERMISSIONS[u.staffRole ?? 'support'].includes(permission))
    throw new ApiError('forbidden', 'missing_permission', { permission });
  return { id: u.id, name: u.name, phoneE164: u.phoneE164 };
}
