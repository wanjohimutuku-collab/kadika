import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GuestQuery, ImportRowInput, SendRequest, WeddingEvent } from '@harusi/api-client';
import type { CardKind, EventInput, GuestInput, PaymentMethod } from '@harusi/schemas';

export type ManualMethod = PaymentMethod;
import { getRepository } from './repo';

const repo = () => getRepository();

export const keys = {
  events: ['events'] as const,
  event: (id: string) => ['event', id] as const,
  guests: (id: string, q?: GuestQuery) => ['guests', id, q ?? {}] as const,
  guest: (id: string) => ['guest', id] as const,
  members: (id: string) => ['members', id] as const,
};

export const useEvents = () =>
  useQuery({ queryKey: keys.events, queryFn: () => repo().listEvents() });
export const useEvent = (id: string) =>
  useQuery({ queryKey: keys.event(id), queryFn: () => repo().getEvent(id) });
export const useGuests = (eventId: string, q?: GuestQuery) =>
  useQuery({ queryKey: keys.guests(eventId, q), queryFn: () => repo().listGuests(eventId, q) });
export const usePledgeSummary = (eventId: string) =>
  useQuery({ queryKey: ['pledges', eventId], queryFn: () => repo().getPledgeSummary(eventId) });
export const useGuest = (id: string) =>
  useQuery({ queryKey: keys.guest(id), queryFn: () => repo().getGuest(id) });
export const useMembers = (eventId: string) =>
  useQuery({ queryKey: keys.members(eventId), queryFn: () => repo().listMembers(eventId) });

function useInvalidating<TVars, TData>(
  fn: (v: TVars) => Promise<TData>,
  invalidate: (v: TVars, d: TData) => readonly (readonly unknown[])[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (d, v) => {
      for (const k of invalidate(v, d)) void qc.invalidateQueries({ queryKey: k });
    },
  });
}

export const useCreateEvent = () =>
  useInvalidating(
    (i: EventInput) => repo().createEvent(i),
    () => [keys.events],
  );
export const useUpdateEvent = (id: string) =>
  useInvalidating(
    (p: Partial<WeddingEvent>) => repo().updateEvent(id, p),
    () => [keys.events, keys.event(id)],
  );
export const useCreateGuest = (eventId: string) =>
  useInvalidating(
    (i: GuestInput) => repo().createGuest(eventId, i),
    () => [['guests', eventId], keys.event(eventId)],
  );
export const useImportGuests = (eventId: string) =>
  useInvalidating(
    (v: { rows: ImportRowInput[]; key: string; cardKind?: CardKind }) =>
      repo().importGuests(eventId, v.rows, v.key, { cardKind: v.cardKind }),
    () => [['guests', eventId], keys.event(eventId)],
  );
export const useUpdateGuest = (eventId: string) =>
  useInvalidating(
    (v: { guestId: string; patch: Partial<GuestInput> }) => repo().updateGuest(v.guestId, v.patch),
    (v) => [keys.guest(v.guestId), ['guests', eventId], keys.event(eventId)],
  );
export const useRecordPayment = (eventId: string) =>
  useInvalidating(
    (v: {
      guestId: string;
      amount: number;
      method: ManualMethod;
      reference: string;
      note: string;
      key: string;
    }) =>
      repo().recordManualPayment(
        eventId,
        {
          guestId: v.guestId,
          amount: v.amount,
          method: v.method,
          reference: v.reference,
          note: v.note,
        },
        v.key,
      ),
    (v) => [
      ['pledges', eventId],
      keys.event(eventId),
      keys.guest(v.guestId),
      ['payments', eventId],
    ],
  );
export const useSetPledge = (eventId: string) =>
  useInvalidating(
    (v: { guestId: string; amount: number; note?: string }) =>
      repo().upsertPledge(v.guestId, v.amount, v.note),
    (v) => [['pledges', eventId], keys.event(eventId), keys.guest(v.guestId)],
  );
export const useReissue = (eventId: string) =>
  useInvalidating(
    (guestId: string) => repo().reissueGuest(guestId),
    (id) => [keys.guest(id), ['guests', eventId]],
  );
export const useDeleteGuest = (eventId: string) =>
  useInvalidating(
    (guestId: string) => repo().deleteGuests([guestId]),
    () => [['guests', eventId], keys.event(eventId)],
  );
export const useSend = (eventId: string) =>
  useInvalidating(
    (r: SendRequest) => repo().sendInvitations(eventId, r),
    () => [['guests', eventId], keys.event(eventId)],
  );
export const useRetryFailed = (eventId: string) =>
  useInvalidating(
    (jobId: string) => repo().retryFailed(jobId),
    () => [['guests', eventId], keys.event(eventId)],
  );
export const useInviteMember = (eventId: string) =>
  useInvalidating(
    (v: { name: string; phoneE164: string; role: 'committee' | 'gate' }) =>
      repo().inviteMember(eventId, v),
    () => [keys.members(eventId)],
  );
export const useRevokeMember = (eventId: string) =>
  useInvalidating(
    (memberId: string) => repo().revokeMember(eventId, memberId),
    () => [keys.members(eventId)],
  );
