'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Check, Circle, HandCoins, MessageSquare, Printer, Sparkles } from 'lucide-react';
import { CardPreview } from '@/components/console/card-preview';
import { BuySheet, type BuyItem } from '@/components/console/buy-sheet';
import { QueryState } from '@/components/console/query-state';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, Chip, ProgressBar, Skeleton } from '@/components/ui/display';
import { TextField } from '@/components/ui/form';
import { getRepository } from '@/lib/repo';
import { qk, useEvent } from '@/lib/queries';
import { cn } from '@/lib/cn';
import { formatMoney, formatNumber } from '@/lib/format';

const STEPS = ['design', 'names', 'qr', 'ready'] as const;
const STEP_MS = 850;
const QUICK = [50, 100, 200, 300, 500];
const MAX_ORDER = 10_000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Right after a host creates an event (ADR 042): their own card is put together in front of them —
 * theme, names, QR — and then they choose how many cards to buy. Buying is optional: they can start
 * with the free cards and buy later from the Plan page.
 */
export default function WelcomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('welcome');
  const tb = useTranslations('billing');
  const router = useRouter();
  const event = useEvent(id);
  const billing = useQuery({
    queryKey: qk.billing(id),
    queryFn: () => getRepository().getBilling(id),
  });

  // The "building" moment: one step every ~0.85 s; instant when the device asks for less motion.
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setDone(STEPS.length);
      return;
    }
    const timer = setInterval(() => setDone((d) => (d >= STEPS.length ? d : d + 1)), STEP_MS);
    return () => clearInterval(timer);
  }, []);
  const ready = done >= STEPS.length && !!event.data && !!billing.data;

  const [raw, setRaw] = useState('100');
  const [item, setItem] = useState<BuyItem | null>(null);
  const n = Math.min(MAX_ORDER, Math.max(0, Math.floor(Number(raw) || 0)));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-24 md:pb-8">
      <QueryState query={event} skeleton={<Skeleton className="h-96" />}>
        {(e) => {
          const data = {
            eventKind: e.eventKind,
            partnerA: e.partnerA,
            partnerB: e.partnerB,
            dateStart: e.dateStart,
            venueName: e.venueName,
            dressCode: e.dressCode,
            themeId: e.themeId,
            coverGradient: e.coverGradient,
            palette: e.palette,
            greeting: e.greeting,
            senderName: e.senderName,
            committeePhone: e.committeePhone,
          };
          return (
            <section
              aria-labelledby="welcome-h"
              className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_1.1fr]"
            >
              <div
                className="relative mx-auto max-h-[18rem] w-full max-w-[16rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)] md:max-h-none md:max-w-xs md:[mask-image:none]"
                data-testid="welcome-preview"
              >
                <div
                  className={cn(
                    'transition-[filter,opacity] duration-500 ease-out motion-reduce:transition-none',
                    ready ? 'opacity-100 blur-0' : 'opacity-80 blur-[1.5px]',
                  )}
                >
                  <CardPreview data={data} compact />
                </div>
                {!ready ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 animate-pulse rounded-card bg-surface/30 motion-reduce:animate-none"
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-primary uppercase">
                  <Sparkles className="size-4" aria-hidden="true" />
                  {t('eyebrow')}
                </p>
                <h1 id="welcome-h" className="font-display text-3xl leading-tight font-semibold">
                  {ready ? t('readyTitle') : t('buildingTitle')}
                </h1>
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy={!ready}
                  className="flex flex-col gap-3"
                >
                  <ProgressBar
                    value={done / STEPS.length}
                    label={t('progressLabel')}
                    valueText={t('progress', {
                      done: Math.min(done, STEPS.length),
                      total: STEPS.length,
                    })}
                  />
                  <ol className="flex flex-col gap-2" data-testid="welcome-steps">
                    {STEPS.map((s, i) => {
                      const ok = i < done;
                      return (
                        <li
                          key={s}
                          className={cn(
                            'flex items-center gap-2 transition-colors duration-200',
                            ok ? 'text-ink' : 'text-muted',
                          )}
                        >
                          {ok ? (
                            <Check className="size-5 text-success" aria-hidden="true" />
                          ) : (
                            <Circle className="size-5" aria-hidden="true" />
                          )}
                          <span>{t(`steps.${s}`)}</span>
                          <span className="sr-only">{ok ? t('stepDone') : t('stepPending')}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            </section>
          );
        }}
      </QueryState>

      {ready && billing.data ? (
        <Card title={t('offerTitle')} titleId="offer-h" className="fade-in">
          {(() => {
            const b = billing.data;
            const tiers = b.cardTiers;
            const each =
              tiers.filter((x) => x.minCards <= Math.max(1, n)).at(-1)?.price ??
              tiers[0]?.price ??
              0;
            const total = n * each;
            return (
              <div className="flex flex-col gap-5" data-testid="welcome-offer">
                <p className="text-muted">{t('offerIntro')}</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label={t('quickLabel')}>
                  {QUICK.map((q) => (
                    <Chip key={q} pressed={n === q} onClick={() => setRaw(String(q))}>
                      {t('guests', { n: formatNumber(q) })}
                    </Chip>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  <TextField
                    label={t('howMany')}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_ORDER}
                    value={raw}
                    onChange={(ev) => setRaw(ev.target.value)}
                    wrapperClassName="w-40"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="tabular text-3xl font-bold" data-testid="welcome-total">
                      {formatMoney(total, b.currency)}
                    </p>
                    <p className="text-sm text-muted">
                      {tb('orderDetail', {
                        n: formatNumber(n),
                        price: formatMoney(each, b.currency),
                        credits: formatNumber(n * b.messagesPerCard),
                      })}
                    </p>
                  </div>
                </div>
                <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                  <li className="flex items-start gap-2">
                    <Printer className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {t('point.generated')}
                  </li>
                  <li className="flex items-start gap-2">
                    <MessageSquare
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {t('point.reminders', { per: b.messagesPerCard })}
                  </li>
                  <li className="flex items-start gap-2">
                    <HandCoins className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {t('point.contributions')}
                  </li>
                </ul>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    size="lg"
                    disabled={n < 1}
                    onClick={() =>
                      setItem({
                        order: { cards: n },
                        title: tb('cards', { n: formatNumber(n) }),
                        detail: tb('orderDetail', {
                          n: formatNumber(n),
                          price: formatMoney(each, b.currency),
                          credits: formatNumber(n * b.messagesPerCard),
                        }),
                        amount: total,
                      })
                    }
                    data-testid="welcome-buy"
                  >
                    {t('buy', { n: formatNumber(n), total: formatMoney(total, b.currency) })}
                  </Button>
                  <Link
                    href={`/app/e/${id}`}
                    className={buttonClasses('ghost', 'lg')}
                    data-testid="welcome-skip"
                  >
                    {t('skip', { n: formatNumber(b.free.cards) })}
                  </Link>
                </div>
                <BuySheet
                  eventId={id}
                  item={item}
                  currency={b.currency}
                  mobilePayAvailable={b.mobilePayAvailable}
                  onClose={() => setItem(null)}
                  onPaid={() => router.push(`/app/e/${id}/guests/import`)}
                />
              </div>
            );
          })()}
        </Card>
      ) : null}
    </div>
  );
}
