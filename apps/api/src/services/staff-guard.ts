import { eq } from 'drizzle-orm';
import { users } from '@harusi/db';
import type { Db } from '@harusi/db';
import { ApiError } from '../errors';

/**
 * Settings hold provider secrets and the public brand, so only admin staff may read or change them
 * (ADR 031, 036): an active user with `role_global = admin` and `staff_role = admin`. Support and billing
 * staff get `missing_permission: settings`; everyone else gets a plain refusal.
 */
export async function requireSettingsAdmin(db: Db, userId: string): Promise<void> {
  const [u] = await db
    .select({ role: users.roleGlobal, staffRole: users.staffRole, status: users.status })
    .from(users)
    .where(eq(users.id, userId));
  if (!u || u.role !== 'admin' || u.status !== 'active')
    throw new ApiError('forbidden', 'Staff only');
  if (u.staffRole !== 'admin')
    throw new ApiError('forbidden', 'missing_permission', { permission: 'settings' });
}
