'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  CalendarPlus,
  CheckCircle2,
  Download,
  FileDown,
  MapPin,
  Phone,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sun,
  XCircle,
} from 'lucide-react';
import type { CardView } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { Button, buttonClasses } from '@/components/ui/button';
import { Banner, Skeleton } from '@/components/ui/display';
import { Stepper } from '@/components/ui/stepper';
import { QrSvg } from '@/components/ui/qr-svg';
import { CardLanguageChip } from './card-language-chip';
import { useTinyLocale, useTinyT } from '@/lib/tiny-intl';
import {
  formatClock,
  formatDate,
  formatDateShort,
  formatPhone,
  formatTime,
  formatTzs,
  formatWeekday,
  swahiliTime,
} from '@/lib/format';
import { themeStyle } from '@/lib/theme';
import {
  clearPendingRsvp,
  readCachedCard,
  readPendingRsvp,
  writeCachedCard,
  writePendingRsvp,
} from '@/lib/card-cache';
import { buildIcs } from '@/lib/ics';
import { APP_DOMAIN } from '@/lib/env';
import { cn } from '@/lib/cn';
import { OrnamentBand, OrnamentDiamond } from './ornament';
import type * as RepoModule from '@/lib/repo';

/** The repository (and mock data) load in their own chunk after first paint. */
let repoModule: Promise<typeof RepoModule> | null = null;
const loadRepo = () => (repoModule ??= import('@/lib/repo'));

function isOffline(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'offline';
}

function download(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export interface QrData {
  payload: string;
  path: string;
  dim: number;
}

export function GuestCard({
  token,
  initial,
  initialQr = null,
  demo,
}: {
  token: string;
  initial: CardView | null;
  initialQr?: QrData | null;
  demo?: 'live' | 'cached' | 'loading' | 'error';
}) {
  const t = useTinyT('card');
  const ts = useTinyT('states');
  const locale = useTinyLocale();
  const [view, setView] = useState<CardView | null>(initial);
  const [status, setStatus] = useState<'loading' | 'live' | 'cached' | 'error'>(
    initial ? 'loading' : 'loading',
  );
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { getRepository } = await loadRepo();
      let v = await getRepository().getCard(token);
      // Replay an answer that was given but never confirmed (tab closed, reload, offline).
      const pending = readPendingRsvp(token);
      if (pending && v.state === 'ok' && v.rsvpOpen) {
        v = await getRepository().rsvp(
          token,
          { attending: pending.attending, partySize: pending.partySize },
          pending.idempotencyKey,
        );
        clearPendingRsvp(token);
      } else if (pending) clearPendingRsvp(token);
      setView(v);
      setStatus('live');
      if (v.state === 'ok') writeCachedCard(v);
    } catch (e) {
      const cached = readCachedCard(token);
      if (cached) {
        setView(cached.view);
        setCachedAt(cached.savedAt);
        setStatus('cached');
      } else if (isOffline(e) && initial) {
        setStatus('cached');
      } else {
        setStatus('error');
      }
    }
  }, [token, initial]);

  useEffect(() => {
    if (demo) {
      // /dev/states: render a fixed state without touching the repository.
      setStatus(demo === 'live' ? 'live' : demo);
      if (demo === 'loading' || demo === 'error') setView(null);
      return;
    }
    const cached = readCachedCard(token);
    if (!initial && cached) setView(cached.view);
    if (!initial) {
      void load();
      return;
    }
    // The server already painted the card: refresh when the main thread is idle so the data layer
    // doesn't compete with hydration on low-end phones (Lighthouse TBT, §10).
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => void load(), { timeout: 2000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(id);
  }, [token, initial, load, demo]);

  if (!view) {
    if (status === 'error') return <CardError onRetry={load} />;
    return <CardSkeleton label={ts('loading')} />;
  }
  if (view.state !== 'ok' || !view.event || !view.guest)
    return <CardProblem state={view.state === 'reissued' ? 'reissued' : 'invalid'} />;
  return (
    <CardBody
      view={view}
      setView={setView}
      status={status}
      cachedAt={cachedAt}
      locale={locale}
      onRetry={load}
      t={t}
      initialQr={initialQr}
    />
  );
}

function CardSkeleton({ label }: { label: string }) {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4" aria-busy="true">
      <span role="status" className="sr-only">
        {label}
      </span>
      <Skeleton className="h-56" />
      <Skeleton className="h-20" />
      <Skeleton className="h-36" />
      <Skeleton className="h-72" />
    </main>
  );
}

function CardError({ onRetry }: { onRetry: () => void }) {
  const ts = useTinyT('states');
  const tc = useTinyT('common');
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center"
      data-testid="card-error"
    >
      <XCircle className="size-12 text-danger" aria-hidden="true" />
      <h1 className="text-xl font-semibold">{ts('errorTitle')}</h1>
      <p className="text-muted">{ts('errorBody')}</p>
      <Button onClick={onRetry}>{tc('retry')}</Button>
    </main>
  );
}

function CardProblem({ state }: { state: 'invalid' | 'reissued' }) {
  const t = useTinyT('card');
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center"
      data-testid={`card-${state}`}
    >
      <span
        className="flex size-16 items-center justify-center rounded-full bg-warning/15"
        aria-hidden="true"
      >
        <XCircle className="size-9 text-warning" />
      </span>
      <h1 className="text-2xl font-semibold">
        {t(state === 'reissued' ? 'reissuedTitle' : 'invalidTitle')}
      </h1>
      <p className="text-lg">{t(state === 'reissued' ? 'reissuedBody' : 'invalidBody')}</p>
      <a href="/k" className={buttonClasses('secondary', 'md')}>
        {t('enterCodeInstead')}
      </a>
      <p className="flex items-center gap-1.5 text-sm text-muted">
        <ShieldCheck className="size-4" aria-hidden="true" />
        {t('trustNever')}
      </p>
      <div className="mt-2">
        <CardLanguageChip />
      </div>
    </main>
  );
}

function Section({
  children,
  className,
  label,
  id,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={label ? id : undefined}
      className={cn('border-b border-border bg-surface px-5 py-5', className)}
    >
      {children}
    </section>
  );
}

interface BodyProps {
  view: CardView;
  setView: (v: CardView) => void;
  status: 'loading' | 'live' | 'cached' | 'error';
  cachedAt: string | null;
  locale: Locale;
  onRetry: () => void;
  t: ReturnType<typeof useTinyT>;
  initialQr: QrData | null;
}

function CardBody({ view, setView, status, locale, t, initialQr }: BodyProps) {
  const ts = useTinyT('states');
  const tc = useTinyT('common');
  const event = view.event!;
  const guest = view.guest!;
  const answered = view.rsvp.status !== 'pending';
  const [editing, setEditing] = useState(false);
  const [choosingParty, setChoosingParty] = useState(false);
  const [party, setParty] = useState(
    view.rsvp.partySize && view.rsvp.partySize > 0 ? view.rsvp.partySize : guest.partySizeAllowed,
  );
  const [saving, setSaving] = useState<'yes' | 'no' | null>(null);
  const [rsvpNotice, setRsvpNotice] = useState<
    'confirmed' | 'declined' | 'queued' | 'failed' | null
  >(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const qrRef = useRef<HTMLElement>(null);
  const [qr, setQr] = useState<QrData | null>(
    initialQr && initialQr.payload === view.qrPayload ? initialQr : null,
  );

  // The server renders the QR path; the encoder only loads if the payload changed (e.g. offline copy).
  useEffect(() => {
    if (!view.qrPayload || qr?.payload === view.qrPayload) return;
    let cancelled = false;
    void import('@/lib/qr').then(({ qrMatrix, qrPath, QR_QUIET_ZONE }) => {
      if (cancelled) return;
      const m = qrMatrix(view.qrPayload!);
      setQr({ payload: view.qrPayload!, path: qrPath(m), dim: m.size + QR_QUIET_ZONE * 2 });
    });
    return () => {
      cancelled = true;
    };
  }, [view.qrPayload, qr?.payload]);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const submit = async (attending: boolean, size: number) => {
    const previous = view;
    setSaving(attending ? 'yes' : 'no');
    setRsvpNotice(null);
    // Optimistic update (§7.4); rolled back if the call fails for a reason other than being offline.
    setView({
      ...view,
      rsvp: { status: attending ? 'confirmed' : 'declined', partySize: attending ? size : 0 },
    });
    const { getRepository, getMock, newIdempotencyKey } = await loadRepo();
    const pending = {
      attending,
      partySize: attending ? size : 0,
      idempotencyKey: newIdempotencyKey(),
      at: new Date().toISOString(),
    };
    writePendingRsvp(view.token, pending);
    try {
      const next = await getRepository().rsvp(
        view.token,
        { attending, partySize: pending.partySize },
        pending.idempotencyKey,
      );
      clearPendingRsvp(view.token);
      setView(next);
      writeCachedCard(next);
      const offline = getMock()?.controls.get().network === 'offline' || !navigator.onLine;
      setRsvpNotice(offline ? 'queued' : attending ? 'confirmed' : 'declined');
      setEditing(false);
      setChoosingParty(false);
      if (attending)
        requestAnimationFrame(() =>
          qrRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
        );
    } catch (e) {
      if (isOffline(e)) {
        // Keep the optimistic answer; the outbox replays it when the card is next opened online.
        setRsvpNotice('queued');
      } else {
        clearPendingRsvp(view.token);
        setView(previous);
        setRsvpNotice('failed');
      }
    } finally {
      setSaving(null);
    }
  };

  const dateLong = formatDate(event.dateStart, locale);
  const people = tc('people', { count: view.rsvp.partySize ?? 1 });
  const rsvpOpen = view.rsvpOpen && !view.eventPassed;
  const showRsvpButtons = rsvpOpen && (!answered || editing);
  const qrVisible = view.qrPayload && view.rsvp.status !== 'declined';
  const mapHref =
    event.venueMapUrl ||
    `https://www.openstreetmap.org/search?query=${encodeURIComponent(event.venueName)}`;

  const onYes = () => {
    if (guest.partySizeAllowed > 1 && !choosingParty) setChoosingParty(true);
    else void submit(true, party);
  };

  const qrSection = qrVisible ? (
    <Section className="flex flex-col items-center gap-3 text-center" id="qr-title" label="qr">
      <h2 id="qr-title" className="text-lg font-semibold">
        {t('qrTitle')}
      </h2>
      <div className="rounded-card border border-border bg-white p-3" data-testid="qr-block">
        {qr ? (
          <QrSvg
            path={qr.path}
            dim={qr.dim}
            alt={t('qrAlt', { code: guest.shortCode })}
            size={232}
          />
        ) : (
          <div className="skeleton size-[232px]" aria-hidden="true" />
        )}
      </div>
      <p className="flex flex-col items-center">
        <span className="text-sm text-muted">{t('codeLabel')}</span>
        <span className="font-mono text-4xl font-bold tracking-[0.18em]" data-testid="short-code">
          {guest.shortCode}
        </span>
      </p>
      <p className="text-sm text-muted">{t('codeHelp')}</p>
      <p className="flex items-center gap-2 rounded-full bg-accent/12 px-3 py-1.5 text-sm font-medium">
        <Sun className="size-4 text-ink" aria-hidden="true" />
        {t('brightnessHint')}
      </p>
      {view.isMock ? <p className="text-xs text-muted">{t('mockToken')}</p> : null}
      <div className="no-print mt-1 grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <Button
          variant="secondary"
          icon={<Download className="size-5" aria-hidden="true" />}
          onClick={async () => {
            const { qrPngDataUrl } = await import('@/lib/qr');
            download(qrPngDataUrl(view.qrPayload!, guest.shortCode), `kadi-${guest.shortCode}.png`);
          }}
          data-testid="download-qr"
        >
          {t('downloadQr')}
        </Button>
        <Button
          variant="secondary"
          icon={<CalendarPlus className="size-5" aria-hidden="true" />}
          onClick={() => {
            const ics = buildIcs({
              uid: `${view.token.slice(0, 12)}@${APP_DOMAIN}`,
              title: t('calendarTitle', { couple: event.coupleNames }),
              start: event.dateStart,
              location: event.venueName,
              description: [
                event.dressCode ? t('dressCode', { dressCode: event.dressCode }) : '',
                `${t('codeLabel')}: ${guest.shortCode}`,
                location.href,
              ]
                .filter(Boolean)
                .join('\n'),
              url: location.href,
            });
            const url = URL.createObjectURL(
              new Blob([ics], { type: 'text/calendar;charset=utf-8' }),
            );
            download(url, `harusi-${guest.shortCode}.ics`);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
          }}
        >
          {t('addCalendar')}
        </Button>
        <Button
          variant="secondary"
          icon={<Smartphone className="size-5" aria-hidden="true" />}
          onClick={async () => {
            if (installEvent) {
              await installEvent.prompt();
              setInstallEvent(null);
            } else setShowInstallHint(true);
          }}
        >
          {t('addHome')}
        </Button>
        <Button
          variant="secondary"
          icon={<FileDown className="size-5" aria-hidden="true" />}
          onClick={() => window.print()}
        >
          {t('savePdf')}
        </Button>
      </div>
      {showInstallHint ? (
        <p role="status" className="text-sm text-muted">
          {t('installHint')}
        </p>
      ) : null}
    </Section>
  ) : null;

  return (
    <div style={themeStyle(event.themeId)} className="min-h-dvh bg-bg">
      <main
        className="mx-auto max-w-lg overflow-hidden bg-surface shadow-sm md:my-6 md:rounded-2xl md:border md:border-border"
        data-testid="guest-card"
        data-ready={status !== 'loading' ? 'true' : undefined}
      >
        {status === 'cached' ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-sm font-medium text-white"
            data-testid="cached-banner"
          >
            {ts('offlineCached')}
          </div>
        ) : null}

        {/* Cover */}
        <header
          className="relative text-center text-on-primary"
          style={{ background: event.coverGradient || 'var(--hp-primary)' }}
        >
          <div
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.38))]"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center gap-1 px-5 pt-7 pb-8">
            <p className="text-sm tracking-[0.2em] uppercase opacity-90">{t('weddingOf')}</p>
            <h1 className="font-display text-[44px] leading-tight font-semibold [text-wrap:balance]">
              {event.partnerA} <span className="text-[0.7em]">&amp;</span> {event.partnerB}
            </h1>
            <OrnamentDiamond className="my-1 [--hp-pattern:#fff]" />
            <p className="text-lg font-semibold">
              {formatWeekday(event.dateStart, locale)} {dateLong}
            </p>
            <p className="text-base opacity-95">
              {locale === 'sw'
                ? `Saa ${swahiliTime(event.dateStart)} (${formatClock(event.dateStart)})`
                : formatTime(event.dateStart, locale)}
            </p>
          </div>
          <OrnamentBand className="relative block bg-surface" id="cover-band" />
        </header>

        {event.greeting ? (
          <p className="bg-surface px-5 pt-4 text-center text-base [text-wrap:balance]">
            {event.greeting}.
            <span className="mt-1 block font-semibold">
              {t('dearGuest', { guest: guest.displayName })}
            </span>
          </p>
        ) : (
          <p className="bg-surface px-5 pt-4 text-center font-semibold">
            {t('invitesYou', { guest: guest.displayName })}
          </p>
        )}

        {/* Trust strip (P1, P7) */}
        <Section className="pt-4">
          <div
            className="flex flex-col gap-3 rounded-card border border-success/30 bg-success/8 p-3"
            data-testid="trust-strip"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{t('trustSender', { sender: event.senderName })}</p>
                <p>{t('trustCommitteePhone', { phone: formatPhone(event.committeePhone) })}</p>
                <p className="text-muted">{t('trustDomain', { domain: APP_DOMAIN })}</p>
                <p className="mt-1 text-muted">{t('trustNever')}</p>
              </div>
            </div>
            <a
              href={`tel:${event.committeePhone}`}
              className={buttonClasses('secondary', 'md', 'w-full')}
              aria-label={t('callCommittee', { phone: formatPhone(event.committeePhone) })}
            >
              <Phone className="size-4" aria-hidden="true" />
              {t('call')}
            </a>
          </div>
        </Section>

        {/* Promote the QR after a "yes" (§17.6) */}
        {view.rsvp.status === 'confirmed' ? qrSection : null}

        {/* Venue + dress code */}
        <Section>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted">{t('venue')}</p>
              <p className="text-lg font-semibold">{event.venueName}</p>
            </div>
          </div>
          <a
            href={mapHref}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('secondary', 'md', 'mt-3 w-full')}
          >
            {t('openMap')}
          </a>
          {event.dressCode ? (
            <p className="mt-4 flex items-center gap-3">
              <Shirt className="size-6 shrink-0 text-primary" aria-hidden="true" />
              <span>{t('dressCode', { dressCode: event.dressCode })}</span>
            </p>
          ) : null}
          {event.extraNote ? <p className="mt-3 text-muted">{event.extraNote}</p> : null}
        </Section>

        {/* RSVP */}
        <Section id="rsvp-title" label="rsvp">
          {view.eventPassed ? (
            <Banner tone="info" title={t('eventPassedTitle')}>
              {t('eventPassedBody')}
            </Banner>
          ) : (
            <>
              <h2 id="rsvp-title" className="text-lg font-semibold">
                {t('rsvpQuestion')}
              </h2>
              {rsvpNotice === 'confirmed' ? (
                <Banner
                  tone="success"
                  title={t('rsvpConfirmedTitle')}
                  className="mt-3"
                  live="polite"
                >
                  {t('rsvpConfirmedBody', { people })}
                </Banner>
              ) : rsvpNotice === 'declined' ? (
                <Banner tone="info" title={t('rsvpDeclinedTitle')} className="mt-3" live="polite">
                  {t('rsvpDeclinedBody')}
                </Banner>
              ) : rsvpNotice === 'queued' ? (
                <Banner tone="offline" className="mt-3" live="polite">
                  {t('rsvpQueued')}
                </Banner>
              ) : rsvpNotice === 'failed' ? (
                <Banner tone="error" className="mt-3" live="assertive">
                  {t('rsvpFailed')}
                </Banner>
              ) : null}

              {answered && !editing ? (
                <div
                  className="mt-3 flex items-center justify-between gap-3 rounded-card border border-border p-3"
                  data-testid="rsvp-summary"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    {view.rsvp.status === 'confirmed' ? (
                      <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                    ) : (
                      <XCircle className="size-5 text-muted" aria-hidden="true" />
                    )}
                    {view.rsvp.status === 'confirmed'
                      ? t('confirmedCompact', { people })
                      : t('declinedCompact')}
                  </span>
                  {rsvpOpen ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                      {t('changeAnswer')}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {!rsvpOpen && !answered ? (
                <Banner tone="warning" className="mt-3">
                  {t('rsvpClosed')}
                </Banner>
              ) : null}

              {showRsvpButtons ? (
                <div className="mt-3 flex flex-col gap-3">
                  {event.rsvpDeadline ? (
                    <p className="text-sm text-muted">
                      {t('rsvpDeadline', { date: formatDateShort(event.rsvpDeadline, locale) })}
                    </p>
                  ) : null}
                  {choosingParty ? (
                    <div className="flex flex-col gap-3 rounded-card border border-border p-3">
                      <Stepper
                        value={party}
                        max={guest.partySizeAllowed}
                        onChange={setParty}
                        label={t('partySize')}
                        decreaseLabel={t('decrease')}
                        increaseLabel={t('increase')}
                        hint={t('partySizeHelp', { max: guest.partySizeAllowed })}
                      />
                      <Button
                        size="lg"
                        block
                        onClick={() => void submit(true, party)}
                        loading={saving === 'yes'}
                        loadingLabel={t('rsvpSaving')}
                        data-testid="rsvp-submit"
                      >
                        {t('sendAnswer')}
                      </Button>
                    </div>
                  ) : null}
                  {!choosingParty ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        size="lg"
                        onClick={onYes}
                        loading={saving === 'yes'}
                        loadingLabel={t('rsvpSaving')}
                        data-testid="rsvp-yes"
                      >
                        {t('rsvpYes')}
                      </Button>
                      <Button
                        size="lg"
                        variant="accent"
                        onClick={() => void submit(false, 0)}
                        loading={saving === 'no'}
                        loadingLabel={t('rsvpSaving')}
                        data-testid="rsvp-no"
                      >
                        {t('rsvpNo')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </Section>

        {view.rsvp.status !== 'confirmed' ? qrSection : null}

        {/* Contribution */}
        {event.pledgesEnabled ? (
          <Section className="no-print">
            <h2 className="text-lg font-semibold">{t('pledgeTitle')}</h2>
            {view.pledge && view.pledge.amountTzs > 0 ? (
              <p className="mt-1" data-testid="pledge-summary">
                {t('pledgeSummary', {
                  pledged: formatTzs(view.pledge.amountTzs),
                  paid: formatTzs(view.pledge.paidTzs),
                  balance: formatTzs(view.pledge.balanceTzs),
                })}
              </p>
            ) : (
              <p className="mt-1 text-muted">{t('pledgeNone')}</p>
            )}
            {view.pledge && view.pledge.amountTzs > 0 && view.pledge.balanceTzs === 0 ? (
              <p className="mt-2 flex items-center gap-2 font-medium text-success">
                <CheckCircle2 className="size-5" aria-hidden="true" />
                <span className="text-ink">{t('pledgePaidInFull')}</span>
              </p>
            ) : (
              <a
                href={`/c/${view.token}/pay`}
                className={buttonClasses('primary', 'md', 'mt-3 w-full')}
                data-testid="pay-link"
              >
                {t('pay')}
              </a>
            )}
          </Section>
        ) : null}

        <footer className="no-print flex flex-col items-center gap-3 bg-bg px-5 py-6 text-sm">
          <CardLanguageChip />
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <a href="/privacy" className="inline-flex min-h-10 items-center underline">
              {t('privacyLink')}
            </a>
            <a
              href={`tel:${event.committeePhone}`}
              className="inline-flex min-h-10 items-center underline"
            >
              {t('footerContact')} · {formatPhone(event.committeePhone)}
            </a>
          </nav>
          <p className="text-muted">{APP_DOMAIN}</p>
        </footer>
      </main>
    </div>
  );
}
