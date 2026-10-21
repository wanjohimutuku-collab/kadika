import type { Guest, GuestFilter, GuestQuery } from '../types';
import { STATUS_RANK } from './funnel';

export const GUEST_FILTERS: GuestFilter[] = [
  'all',
  'unsent',
  'confirmed',
  'no_reply',
  'declined',
  'no_smartphone',
  'print',
  'failed',
  'checked_in',
];

export function matchesFilter(
  g: Pick<Guest, 'status' | 'hasSmartphone' | 'lastMessageFailed'> & { printCard?: boolean },
  f: GuestFilter,
): boolean {
  switch (f) {
    case 'unsent':
      return g.status === 'created' || g.status === 'queued';
    case 'confirmed':
      return g.status === 'confirmed' || g.status === 'checked_in';
    case 'no_reply':
      return g.status === 'sent' || g.status === 'delivered' || g.status === 'opened';
    case 'declined':
      return g.status === 'declined';
    case 'no_smartphone':
      return !g.hasSmartphone;
    case 'print':
      return !!g.printCard;
    case 'failed':
      return g.lastMessageFailed;
    case 'checked_in':
      return g.status === 'checked_in';
    default:
      return true;
  }
}

/** Search by name, any 3+ phone digits (incl. last 4) or card code — shared by the console and the gate. */
export function matchesSearch(
  g: Pick<Guest, 'displayName' | 'phoneE164' | 'shortCode'>,
  raw: string,
): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  if (g.displayName.toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D/g, '');
  if (digits.length >= 3 && g.phoneE164?.replace(/\D/g, '').includes(digits.replace(/^0/, '')))
    return true;
  const code = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length >= 2 && /[A-Z]/.test(code) && g.shortCode.replace('-', '').includes(code);
}

export function applyGuestQuery(list: Guest[], query: GuestQuery = {}): Guest[] {
  let out = list.filter(
    (g) =>
      matchesFilter(g, query.filter ?? 'all') &&
      (!query.cardKind || g.cardKind === query.cardKind) &&
      matchesSearch(g, query.search ?? '') &&
      (!query.group || g.groupLabel === query.group),
  );
  const sort = query.sort ?? { by: 'name', dir: 'asc' };
  const dir = sort.dir === 'asc' ? 1 : -1;
  out = [...out].sort((a, b) => {
    switch (sort.by) {
      case 'status':
        return (
          dir * (STATUS_RANK[a.status] - STATUS_RANK[b.status]) ||
          a.displayName.localeCompare(b.displayName)
        );
      case 'group':
        return (
          dir * a.groupLabel.localeCompare(b.groupLabel) ||
          a.displayName.localeCompare(b.displayName)
        );
      case 'updated':
        return dir * a.updatedAt.localeCompare(b.updatedAt);
      case 'balance':
        return dir * ((a.pledge?.balance ?? -1) - (b.pledge?.balance ?? -1));
      default:
        return dir * a.displayName.localeCompare(b.displayName, 'sw');
    }
  });
  return out;
}

export function filterCounts(list: Guest[]): Record<GuestFilter, number> {
  const out = Object.fromEntries(GUEST_FILTERS.map((f) => [f, 0])) as Record<GuestFilter, number>;
  for (const g of list) for (const f of GUEST_FILTERS) if (matchesFilter(g, f)) out[f]++;
  return out;
}
