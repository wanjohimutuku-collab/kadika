'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { isRepositoryError, type QuotaExceededDetails } from '@harusi/api-client';
import { useToast } from '@/components/ui/toast';

/**
 * Turns the API's `payment_required` refusal (ADR 042: cards or messages used up) into a toast that says
 * what ran out and links to the event's billing page. Returns false for any other error, so callers
 * keep their own message: `onError: (e) => quota(e) || toast(...)`.
 */
export function useQuotaToast(eventId: string): (e: unknown) => boolean {
  const t = useTranslations('billing.quota');
  const router = useRouter();
  const toast = useToast();
  return (e) => {
    if (!isRepositoryError(e) || e.code !== 'payment_required') return false;
    const d = (e.details ?? {}) as Partial<QuotaExceededDetails>;
    toast({
      tone: 'error',
      title: t(d.resource ?? 'cards', { remaining: d.remaining ?? 0, needed: d.needed ?? 0 }),
      action: { label: t('action'), onClick: () => router.push(`/app/e/${eventId}/billing`) },
      durationMs: 10_000,
    });
    return true;
  };
}
