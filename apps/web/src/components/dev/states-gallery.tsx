'use client';

import { useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@harusi/i18n';
import {
  CalendarHeart,
  HandCoins,
  ScanLine,
  Search,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import type { CardView } from '@harusi/api-client';
import { renderCard, renderProblem } from '@/lib/light-card/render';
import { ErrorState } from '@/components/console/query-state';
import { Button } from '@/components/ui/button';
import { Banner, EmptyState, Skeleton } from '@/components/ui/display';
import { ConfirmSheet } from '@/components/ui/overlay';
import { ToastProvider } from '@/components/ui/toast';
import { RepositoryError } from '@harusi/api-client';

type State = 'loading' | 'empty' | 'error' | 'offline' | 'partial' | 'permission' | 'destructive';
const STATES: State[] = [
  'loading',
  'empty',
  'error',
  'offline',
  'partial',
  'permission',
  'destructive',
];

interface Screen {
  key: string;
  title: string;
  skeleton: ReactNode;
  empty: ReactNode;
  icon: ReactNode;
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-semibold text-muted">{title}</figcaption>
      <div className="min-h-40 overflow-hidden rounded-card border border-border bg-bg p-3">
        {children}
      </div>
    </figure>
  );
}

export function StatesGallery({ card }: { card: CardView }) {
  const t = useTranslations('devStates');
  const ts = useTranslations('states');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const tg = useTranslations('guests');
  const te = useTranslations('events');
  const tp = useTranslations('pledges');
  const tgate = useTranslations('gate');
  const [confirm, setConfirm] = useState<string | null>(null);
  const locale = useLocale() as Locale;

  const screens: Screen[] = [
    {
      key: 'events',
      title: te('title'),
      icon: <CalendarHeart className="size-7" />,
      skeleton: <Skeleton className="h-40" />,
      empty: (
        <EmptyState
          icon={<CalendarHeart className="size-7" />}
          title={te('empty')}
          action={<Button>{te('new')}</Button>}
        />
      ),
    },
    {
      key: 'overview',
      title: tn('overview'),
      icon: <CalendarHeart className="size-7" />,
      skeleton: (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ),
      empty: (
        <EmptyState
          icon={<Users className="size-7" />}
          title={tg('empty')}
          action={<Button>{tg('addImport')}</Button>}
        />
      ),
    },
    {
      key: 'guests',
      title: tn('guests'),
      icon: <Users className="size-7" />,
      skeleton: (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ),
      empty: (
        <EmptyState
          icon={<Search className="size-7" />}
          title={tg('emptyFiltered')}
          action={<Button variant="secondary">{tg('clearFilters')}</Button>}
        />
      ),
    },
    {
      key: 'pledges',
      title: tn('pledges'),
      icon: <HandCoins className="size-7" />,
      skeleton: <Skeleton className="h-40" />,
      empty: <EmptyState icon={<HandCoins className="size-7" />} title={tp('historyEmpty')} />,
    },
    {
      key: 'gate',
      title: tn('gate'),
      icon: <ScanLine className="size-7" />,
      skeleton: <Skeleton className="h-40" />,
      empty: <EmptyState icon={<ScanLine className="size-7" />} title={tgate('logEmpty')} />,
    },
  ];

  const render = (s: Screen, st: State): ReactNode => {
    switch (st) {
      case 'loading':
        return s.skeleton;
      case 'empty':
        return s.empty;
      case 'error':
        return <ErrorState error={new RepositoryError('server')} onRetry={() => {}} />;
      case 'offline':
        return (
          <>
            <div
              role="status"
              className="mb-2 rounded-input bg-ink px-3 py-2 text-center text-sm font-medium text-white"
            >
              {ts('offlineBanner')}
            </div>
            {s.skeleton}
          </>
        );
      case 'partial':
        return (
          <Banner
            tone="warning"
            title={ts('partialFailure', { failed: 3, total: 120 })}
            action={
              <Button size="sm" variant="secondary">
                {ts('retryFailed')}
              </Button>
            }
          />
        );
      case 'permission':
        return (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <ShieldAlert className="size-8 text-warning" aria-hidden="true" />
            <p className="font-semibold">
              {s.key === 'gate' ? ts('permCamera') : ts('permContacts')}
            </p>
            <p className="text-sm text-muted">{ts('permBody')}</p>
            <Button size="sm" variant="secondary">
              {ts('useAlternative')}
            </Button>
          </div>
        );
      case 'destructive':
        return (
          <Button
            variant="danger"
            icon={<Trash2 className="size-4" aria-hidden="true" />}
            onClick={() => setConfirm(s.key)}
          >
            {tc('delete')}
          </Button>
        );
    }
  };

  const passed: CardView = { ...card, eventPassed: true, rsvpOpen: false };
  const closed: CardView = {
    ...card,
    rsvpOpen: false,
    rsvp: { status: 'pending', partySize: null },
  };

  return (
    <ToastProvider closeLabel={tc('close')}>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-semibold">{t('title')}</h1>
          <p className="text-muted">{t('intro')}</p>
        </header>
        {screens.map((s) => (
          <section key={s.key} aria-labelledby={`st-${s.key}`} className="flex flex-col gap-3">
            <h2 id={`st-${s.key}`} className="text-xl font-semibold">
              {s.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STATES.map((st) => (
                <Frame key={st} title={t(st)}>
                  {render(s, st)}
                </Frame>
              ))}
            </div>
          </section>
        ))}
        <section aria-labelledby="st-card" className="flex flex-col gap-3">
          <h2 id="st-card" className="text-xl font-semibold">
            /c/[token]
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(
              [
                ['live', card],
                ['error', 'error'],
                ['reissued', 'reissued'],
                ['invalid', 'invalid'],
                ['passed', passed],
                ['rsvp closed', closed],
              ] as const
            ).map(([label, view]) => (
              <Frame key={label} title={label}>
                <iframe
                  title={`/c/[token] ${label}`}
                  className="h-[560px] w-full rounded-md border border-border bg-bg"
                  srcDoc={
                    typeof view === 'string'
                      ? renderProblem(view, { locale, domain: 'kadisasa.example' })
                      : renderCard(view, {
                          token: card.token,
                          locale,
                          domain: 'kadisasa.example',
                          mode: 'mock',
                          apiUrl: '',
                        })
                  }
                />
              </Frame>
            ))}
          </div>
        </section>
      </main>
      <ConfirmSheet
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={tg('deleteTitle', { count: 3 })}
        consequence={tg('deleteBody')}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        onConfirm={() => setConfirm(null)}
      />
    </ToastProvider>
  );
}
