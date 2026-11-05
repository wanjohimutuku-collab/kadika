'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { SmsCampaignView, SmsTarget } from '@harusi/schemas/sms';
import { StatusPill } from '@/components/ui/display';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';

/** Per-viewer conveniences only (ADR 055): an unsent draft and contacts picked on Wapokeaji. */
const draftKey = (id: string) => `harusi.sms.draft.${id}`;
const pickedKey = (id: string) => `harusi.sms.picked.${id}`;

function session(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readDraft(id: string): string {
  try {
    return session()?.getItem(draftKey(id)) ?? '';
  } catch {
    return '';
  }
}

export function saveDraft(id: string, body: string): void {
  try {
    if (body) session()?.setItem(draftKey(id), body);
    else session()?.removeItem(draftKey(id));
  } catch {
    // storage blocked: the draft lives until the page closes
  }
}

export function readPicked(id: string): string[] {
  try {
    const raw = session()?.getItem(pickedKey(id));
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function savePicked(id: string, ids: string[]): void {
  try {
    if (ids.length) session()?.setItem(pickedKey(id), JSON.stringify(ids));
    else session()?.removeItem(pickedKey(id));
  } catch {
    // ignore
  }
}

export function useSmsCampaigns(id: string) {
  return useQuery({
    queryKey: qk.smsCampaigns(id),
    queryFn: () => getRepository().listSmsCampaigns(id),
    // a scheduled text runs on the server's clock; refresh while one is waiting or sending
    refetchInterval: (q) =>
      q.state.data?.some((c) => c.status === 'scheduled' || c.status === 'running')
        ? 30_000
        : false,
  });
}

/** Everyone on the contact list (guests of an SMS-only event). */
export function useContacts(id: string) {
  return useQuery({
    queryKey: qk.guests(id),
    queryFn: () => getRepository().listGuests(id),
  });
}

export function useTargetLabel(): (t: SmsTarget) => string {
  const t = useTranslations('sms.history');
  return (target) =>
    target === 'all'
      ? t('toAll')
      : 'group' in target
        ? t('toGroup', { group: target.group })
        : t('toPicked', { count: target.guestIds.length });
}

const TONE = {
  scheduled: 'info',
  running: 'warning',
  done: 'success',
  cancelled: 'neutral',
} as const;

export function CampaignStatus({ c }: { c: SmsCampaignView }) {
  const t = useTranslations('sms.history.status');
  const failedAll = c.status === 'done' && c.sent === 0 && !!c.error;
  return <StatusPill tone={failedAll ? 'danger' : TONE[c.status]}>{t(c.status)}</StatusPill>;
}

export function useCampaignError(): (c: SmsCampaignView) => string | null {
  const t = useTranslations('sms.history.error');
  const known = ['missed', 'quota_exceeded', 'no provider configured', 'sending paused'] as const;
  type Known = (typeof known)[number];
  const isKnown = (e: string): e is Known => (known as readonly string[]).includes(e);
  return (c) => (!c.error ? null : isKnown(c.error) ? t(c.error) : t('other', { error: c.error }));
}
