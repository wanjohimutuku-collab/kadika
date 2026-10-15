'use client';

import { useQuery, type QueryKey } from '@tanstack/react-query';
import type { GuestQuery } from '@harusi/api-client';
import type { Country, Currency } from '@harusi/schemas/country';
import { getRepository } from './repo';
import { useMockControls } from './use-mock-controls';

/** Query keys in one place so mutations can invalidate precisely. */
export const qk = {
  session: ['session'] as const,
  events: ['events'] as const,
  event: (id: string) => ['event', id] as const,
  guests: (id: string, q?: GuestQuery) =>
    q ? (['guests', id, q] as const) : (['guests', id] as const),
  groups: (id: string) => ['groups', id] as const,
  guest: (gid: string) => ['guest', gid] as const,
  guestMessages: (gid: string) => ['guest-messages', gid] as const,
  guestAudit: (gid: string) => ['guest-audit', gid] as const,
  activity: (id: string) => ['activity', id] as const,
  members: (id: string) => ['members', id] as const,
  payments: (id: string) => ['payments', id] as const,
  gate: (id: string) => ['gate', id] as const,
  scans: (id: string) => ['scans', id] as const,
  report: (id: string) => ['report', id] as const,
  job: (jobId: string) => ['job', jobId] as const,
  ops: (name: string) => ['ops', name] as const,
} satisfies Record<string, QueryKey | ((...a: never[]) => QueryKey)>;

/** Everything that depends on guests/payments for an event. */
export function eventScopedKeys(id: string): QueryKey[] {
  return [
    qk.event(id),
    qk.events,
    qk.guests(id),
    qk.groups(id),
    qk.activity(id),
    qk.payments(id),
    qk.gate(id),
    qk.scans(id),
    qk.report(id),
  ];
}

export function useSession() {
  // The mock role lives in the dev panel; keying on it refreshes the session when it changes.
  const { role } = useMockControls();
  return useQuery({
    queryKey: [...qk.session, role],
    queryFn: () => getRepository().getSession(),
    staleTime: Infinity,
  });
}

export function useEvent(id: string) {
  return useQuery({ queryKey: qk.event(id), queryFn: () => getRepository().getEvent(id) });
}

/** Currency of an event, from the cached event query; Tanzanian shillings until it loads. */
export function useEventCurrency(id: string): Currency {
  return useEvent(id).data?.currency ?? 'TZS';
}

/** Country of an event; Tanzania until it loads. */
export function useEventCountry(id: string): Country {
  return useEvent(id).data?.country ?? 'TZ';
}

export function useEvents() {
  return useQuery({ queryKey: qk.events, queryFn: () => getRepository().listEvents() });
}

/** Every staff-panel query is keyed under `ops`, so one invalidation refreshes the panel. */
export const OPS_ALL = ['ops'] as const;
