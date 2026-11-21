'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, Download, Share2, X } from 'lucide-react';
import {
  buildDemoCardView,
  DEMO_EVENT_TYPES,
  DEMO_THEME_IDS,
  THEME_GRADIENTS,
  THEME_STOPS,
  type DemoEventType,
} from '@/lib/demo-card';
import type { ThemeId } from '@harusi/ui-tokens/themes';
import { emit, hashShort } from '@/lib/analytics-client';
import { useCardImageSrc } from '@/lib/use-card-image';
import { PhoneCardMockup } from '@/components/site/home/phone-card-mockup';
import type { HomeHeroFormLabels } from '@/content/home';

/**
 * Interactive hero. Four inputs (names, date, event kind, theme) drive a live preview rendered
 * into a drawn phone body, and the secondary CTA hands a `/jaribu?...` deep link to the real
 * guest card. The Download button captures the full `renderCard + shell` template (same code
 * path `/jaribu` uses) into an SVG via an SVG `foreignObject`, so the file matches the chosen
 * theme end-to-end: trust strip, cover, RSVP, QR, short code, pledge summary, brand footer.
 *
 * The heavy `renderCard + shell + resolvePalette` tree and the QR encoder are dynamically
 * imported so they only land in the client bundle after the visitor acts — the home's LCP
 * budget (§10) can't afford them at the hero's first paint.
 */

function nextSaturdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  const day = d.getDay();
  const shift = (6 - day + 7) % 7;
  d.setDate(d.getDate() + shift);
  return d.toISOString().slice(0, 10);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

export interface HeroLiveProps {
  locale: 'sw' | 'en';
  /** Section eyebrow (e.g. "Jaribu mwenyewe") shown at top. */
  eyebrow: string;
  h1: string;
  sub: string;
  secondaryBaseHref: string;
  secondaryLabel: string;
  form: HomeHeroFormLabels;
  previewFrameAlt: string;
  /** Server-computed initial date for the hero's date input. Prevents SSR/CSR drift from `new Date()`. */
  initialDateISO: string;
}

/**
 * Interactive demo studio below the Hero. Visitors edit the four fields that drive a real card
 * preview inside a phone frame, then download or share the result. The primary conversion CTA
 * lives on the Hero component above — this island is the "try it yourself" surface, not a hero.
 * Kept named `HeroLive` for backwards import compatibility.
 */
export function HeroLive(props: HeroLiveProps) {
  const [names, setNames] = useState('Asha & Juma');
  // Seed the initial date server-side via a prop so SSR and the client's first render agree.
  // Computing it client-side (`new Date()` in useState or useEffect) races the server's render
  // and React 19 flags a hydration mismatch, which then regenerates the whole subtree — that was
  // the "Share button vanishing" symptom we saw.
  const [dateISO, setDateISO] = useState<string>(() => props.initialDateISO || nextSaturdayISO());
  const [eventType, setEventType] = useState<DemoEventType>('harusi');
  const [themeChoice, setThemeChoice] = useState<ThemeId | 'auto'>('auto');
  const [downloading, setDownloading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const shareTriggerRef = useRef<HTMLButtonElement | null>(null);
  const shareCloseRef = useRef<HTMLButtonElement | null>(null);

  const themeId: ThemeId = useMemo(() => {
    if (themeChoice !== 'auto') return themeChoice;
    switch (eventType) {
      case 'send-off':
        return 'rose-sage';
      case 'kitchen-party':
      case 'kuzaliwa':
        return 'terracotta';
      case 'uchumba':
      case 'mahafali':
      case 'biashara':
        return 'navy-silver';
      default:
        return 'emerald-gold';
    }
  }, [themeChoice, eventType]);

  const view = useMemo(
    () => buildDemoCardView({ names, dateISO, eventType, themeId }),
    [names, dateISO, eventType, themeId],
  );

  useEffect(() => {
    emit('home_hero_view');
  }, []);

  const { src: cardImgSrc } = useCardImageSrc({
    coupleNames: view.event?.coupleNames ?? names,
    partnerA: view.event?.partnerA ?? names,
    partnerB: view.event?.partnerB ?? '',
    eventKind: eventType,
    dateStart: view.event?.dateStart ?? `${dateISO}T14:00:00Z`,
    venueName: view.event?.venueName ?? 'Dar es Salaam',
    dressCode: view.event?.dressCode ?? 'Formal',
    themeId,
    coverGradient: THEME_GRADIENTS[themeId],
    guestName: view.guest?.displayName ?? 'Guest',
    shortCode: view.guest?.shortCode ?? 'KH-4826',
    template: 'classic',
    seats: eventType === 'biashara' ? 1 : 2,
    locale: props.locale,
  });

  const secondaryHref = `${props.secondaryBaseHref}?names=${encodeURIComponent(
    names,
  )}&date=${encodeURIComponent(dateISO)}&event=${encodeURIComponent(eventType)}${
    themeChoice !== 'auto' ? `&theme=${encodeURIComponent(themeChoice)}` : ''
  }`;

  const shareTitle = useMemo(() => view.event?.coupleNames ?? 'Kadi', [view.event?.coupleNames]);

  const shareCard = useCallback(async () => {
    const absolute = new URL(secondaryHref, window.location.origin).toString();
    emit('home_hero_share_click', { themeId, eventType });
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      // iOS/Android share sheets accept url; feature-detect to avoid desktop pop-under quirks.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).canShare?.({ url: absolute }) !== false
    ) {
      try {
        await navigator.share({ title: shareTitle, text: shareTitle, url: absolute });
        emit('home_hero_share_native');
        return;
      } catch {
        // User cancelled or the sheet failed; fall through to the QR dialog.
      }
    }
    setCopied(false);
    setShareUrl(absolute);
    emit('home_hero_share_dialog');
  }, [secondaryHref, shareTitle, themeId, eventType]);

  const closeShare = useCallback(() => {
    setShareUrl(null);
    setCopied(false);
  }, []);

  const copyShareUrl = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      emit('home_hero_share_copy');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard denied — the link is still visible in the input for manual copy.
    }
  }, [shareUrl]);

  // Dismiss on Escape so the dialog is keyboard-operable even without a focus trap.
  useEffect(() => {
    if (!shareUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeShare();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shareUrl, closeShare]);

  // Move focus into the dialog on open, return it to the trigger on close.
  useEffect(() => {
    if (shareUrl) {
      shareCloseRef.current?.focus();
      return () => {
        shareTriggerRef.current?.focus();
      };
    }
  }, [shareUrl]);

  const [shareQr, setShareQr] = useState<{ path: string; dim: number } | null>(null);
  useEffect(() => {
    if (!shareUrl) {
      setShareQr(null);
      return;
    }
    let cancelled = false;
    // Lazy-load the QR encoder on demand — it would otherwise be pulled into the home's first
    // paint bundle and hurt LCP (§10). Share is a secondary, user-initiated path.
    void import('@/lib/qr').then(({ qrMatrix, qrPath, QR_QUIET_ZONE }) => {
      if (cancelled) return;
      const m = qrMatrix(shareUrl);
      const dim = m.size + QR_QUIET_ZONE * 2;
      setShareQr({ path: qrPath(m), dim });
    });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  const downloadCard = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { renderDemoCardToSvg } = await import('@/lib/download-demo-card');
      await renderDemoCardToSvg({
        view,
        locale: props.locale,
        themeId,
        filename: `kadi-${slugify(view.event?.coupleNames ?? 'kadi')}-${themeId}.svg`,
      });
      emit('home_hero_download', { themeId, eventType });
    } catch (err) {
      emit('home_hero_download_failed', { themeId, eventType, err: String(err) });
    } finally {
      setDownloading(false);
    }
  }, [downloading, view, themeId, props.locale, eventType]);

  return (
    <section
      id="jaribu-mwenyewe"
      aria-labelledby="jaribu-mwenyewe-heading"
      className="scroll-mt-24 py-14 md:py-20"
    >
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        <div className="lg:grid lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-10">
          {/* Left column: studio controls */}
          <div className="flex flex-col justify-between gap-6 py-2">
            <div className="flex flex-col gap-3">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e3e8ee] bg-[#f6f9fc] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5469d4]">
                <span aria-hidden="true" className="qw-ripple-dot" />
                {props.eyebrow}
              </p>
              <h2
                id="jaribu-mwenyewe-heading"
                className="text-[28px] font-bold leading-[1.12] tracking-[-0.025em] text-[#0a2640] md:text-[38px]"
              >
                {props.h1}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-[#494d59] md:text-base">
                {props.sub}
              </p>
            </div>

            {/* Quick-fill event presets as a clean top mode strip */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { type: 'harusi', names: 'Asha & Juma' },
                  {
                    type: 'biashara',
                    names: props.locale === 'sw' ? 'Mkutano wa Biashara' : 'Serengeti Tech Summit',
                  },
                  {
                    type: 'kuzaliwa',
                    names: props.locale === 'sw' ? 'Miaka 30 ya Neema' : "Neema's 30th",
                  },
                  {
                    type: 'mahafali',
                    names: props.locale === 'sw' ? 'Mahafali ya UDSM' : 'Class of 2026',
                  },
                ] as const
              ).map((preset) => {
                const selected = eventType === preset.type && names === preset.names;
                return (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => {
                      setEventType(preset.type);
                      setNames(preset.names);
                      setThemeChoice('auto');
                      emit('home_hero_preset', { eventType: preset.type });
                    }}
                    className={`min-h-9 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      selected
                        ? 'bg-[#0a2640] text-white shadow-sm'
                        : 'border border-[#e3e8ee] bg-[#f6f9fc] text-[#0a2640] hover:border-[#5469d4]/50 hover:bg-white hover:text-[#5469d4]'
                    }`}
                  >
                    {props.form.eventLabels[preset.type]}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-[#e3e8ee] bg-[#f6f9fc]/75 p-4 md:p-5">
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#0a2640]">
                {props.form.names}
                <input
                  value={names}
                  placeholder={props.form.namesPlaceholder}
                  maxLength={60}
                  onChange={(e) => {
                    setNames(e.target.value);
                    emit('home_hero_input', { field: 'names' });
                    void hashShort(e.target.value).then((h) =>
                      emit('home_hero_input_hash', { field: 'names', h }),
                    );
                  }}
                  className="h-11 rounded-xl border border-[#e3e8ee] bg-white px-3.5 text-sm font-normal text-[#0a2640] shadow-xs transition focus:border-[#5469d4] focus:ring-2 focus:ring-[#5469d4]/15 focus:outline-none"
                  aria-label={props.form.names}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#0a2640]">
                  {props.form.date}
                  <input
                    type="date"
                    value={dateISO}
                    onChange={(e) => {
                      setDateISO(e.target.value);
                      emit('home_hero_input', { field: 'date' });
                    }}
                    className="h-11 rounded-xl border border-[#e3e8ee] bg-white px-3.5 text-sm font-normal text-[#0a2640] shadow-xs transition focus:border-[#5469d4] focus:ring-2 focus:ring-[#5469d4]/15 focus:outline-none"
                    aria-label={props.form.date}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#0a2640]">
                  {props.form.eventType}
                  <select
                    value={eventType}
                    onChange={(e) => {
                      setEventType(e.target.value as DemoEventType);
                      emit('home_hero_input', { field: 'eventType' });
                    }}
                    className="h-11 rounded-xl border border-[#e3e8ee] bg-white px-3.5 text-sm font-normal text-[#0a2640] shadow-xs transition focus:border-[#5469d4] focus:ring-2 focus:ring-[#5469d4]/15 focus:outline-none"
                    aria-label={props.form.eventType}
                  >
                    {DEMO_EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {props.form.eventLabels[t]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <fieldset className="flex flex-col gap-2 pt-0.5">
                <legend className="text-sm font-semibold text-[#0a2640]">
                  {props.form.themeLabel}
                </legend>
                <div
                  className="grid grid-cols-2 gap-2"
                  role="radiogroup"
                  aria-label={props.form.themeLabel}
                >
                  {DEMO_THEME_IDS.map((t) => {
                    const active = themeChoice === t;
                    const [s0, s1] = THEME_STOPS[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={props.form.themeNames[t]}
                        title={props.form.themeNames[t]}
                        onClick={() => {
                          setThemeChoice(t);
                          emit('home_hero_theme', { themeId: t });
                        }}
                        className={
                          'group relative flex h-11 items-center gap-2.5 rounded-xl border bg-white px-2.5 text-xs font-semibold transition ' +
                          (active
                            ? 'border-[#5469d4] bg-[#5469d4]/5 ring-2 ring-[#5469d4]/20'
                            : 'border-[#e3e8ee] hover:border-[#5469d4]/50')
                        }
                      >
                        <span
                          aria-hidden="true"
                          className="size-6 shrink-0 rounded-lg border border-black/10 shadow-xs"
                          style={{ background: `linear-gradient(135deg,${s0},${s1})` }}
                        />
                        <span className="truncate text-[#0a2640]">{props.form.themeNames[t]}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            {/* Utility action row */}
            <div
              className="flex flex-wrap items-center gap-2.5"
              role="group"
              aria-label={props.form.utilityTrayAria}
            >
              <a
                href={secondaryHref}
                target="_blank"
                rel="noopener"
                onClick={() => emit('home_hero_cta_secondary')}
                className="qw-btn-primary text-sm"
              >
                <span>{props.secondaryLabel}</span>
                <ArrowUpRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={downloadCard}
                disabled={downloading}
                aria-label={props.form.downloadAria}
                data-testid="home-hero-download"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#e3e8ee] bg-white px-4 text-sm font-semibold text-[#0a2640] transition hover:border-[#5469d4]/50 hover:text-[#5469d4] disabled:opacity-60"
              >
                <Download className="size-4 text-[#5469d4]" strokeWidth={2} aria-hidden="true" />
                {props.form.downloadCta}
              </button>
              <button
                ref={shareTriggerRef}
                type="button"
                onClick={shareCard}
                aria-label={props.form.shareAria}
                data-testid="home-hero-share"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#e3e8ee] bg-white px-4 text-sm font-semibold text-[#0a2640] transition hover:border-[#5469d4]/50 hover:text-[#5469d4]"
              >
                <Share2 className="size-4 text-[#5469d4]" strokeWidth={2} aria-hidden="true" />
                {props.form.shareCta}
              </button>
            </div>
          </div>

          {/* Right column: clean transparent preview stage with floating badges & live preview */}
          <div className="group relative mt-8 flex flex-col items-center justify-center gap-5 px-4 py-6 md:px-6 lg:mt-0">
            <div className="relative flex items-center gap-2 rounded-full border border-[#e3e8ee] bg-[#f6f9fc] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0a2640]">
              <span aria-hidden="true" className="qw-ripple-dot" />
              <span>
                {props.locale === 'sw' ? 'Mwonekano wa Moja kwa Moja' : 'Live Card Preview'}
              </span>
              <span className="text-[#494d59]/50">·</span>
              <span className="text-[#5469d4]">{props.form.themeNames[themeId]}</span>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="qw-float-card">
                <PhoneCardMockup src={cardImgSrc} alt={props.previewFrameAlt} />
              </div>

              {/* Floating badge 1: Channel readiness */}
              <div className="qw-float-slow pointer-events-none absolute -left-8 top-14 hidden rounded-xl border border-[#e3e8ee] bg-white/95 px-3 py-2 text-xs font-semibold text-[#0a2640] shadow-lg backdrop-blur-md sm:block">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#5469d4]">
                  {props.locale === 'sw' ? 'Tayari Kutumwa' : 'Ready to Send'}
                </span>
                <span>WhatsApp · SMS · PDF</span>
              </div>

              {/* Floating badge 2: QR Gate token */}
              <div className="qw-float-slow pointer-events-none absolute -right-8 bottom-16 hidden rounded-xl border border-[#e3e8ee] bg-white/95 px-3 py-2 text-xs font-semibold text-[#0a2640] shadow-lg backdrop-blur-md sm:block">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#0f7a47]">
                  {props.locale === 'sw' ? 'Msimbo wa QR' : 'Unique QR Pass'}
                </span>
                <span>{view.guest?.shortCode ?? 'DEMO-0001'}</span>
              </div>
            </div>

            <p className="relative text-center text-xs font-medium text-[#494d59]">
              {props.locale === 'sw'
                ? 'Inabadilika papo hapo unapoandika · Tayari kwa WhatsApp na kuchapisha'
                : 'Updates live as you type · Ready for WhatsApp & print'}
            </p>
          </div>
        </div>
      </div>

      {shareUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={props.form.shareDialogTitle}
          data-testid="home-hero-share-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeShare}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={shareCloseRef}
              type="button"
              onClick={closeShare}
              aria-label={props.form.shareClose}
              className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full text-ks-muted hover:bg-ks-border/40"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <h2 className="pr-8 text-base font-semibold text-ks-ink">
              {props.form.shareDialogTitle}
            </h2>
            <p className="mt-1 text-sm text-ks-muted">{props.form.shareScanHint}</p>
            <div className="mt-4 flex aspect-square items-center justify-center rounded-xl border border-ks-border bg-white p-4">
              {shareQr ? (
                <svg
                  viewBox={`0 0 ${shareQr.dim} ${shareQr.dim}`}
                  width={240}
                  height={240}
                  role="img"
                  aria-label={props.form.shareDialogTitle}
                  className="block"
                  shapeRendering="crispEdges"
                >
                  <rect width={shareQr.dim} height={shareQr.dim} fill="#FFFFFF" />
                  <path d={shareQr.path} fill="#000000" />
                </svg>
              ) : (
                <div
                  className="h-[240px] w-[240px] animate-pulse rounded-md bg-ks-border/40"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="mt-4 flex items-stretch gap-2">
              <input
                readOnly
                value={shareUrl}
                aria-label={props.form.shareDialogTitle}
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 min-w-0 flex-1 rounded-ks border border-ks-border bg-ks-bg px-3 text-sm text-ks-ink"
              />
              <button
                type="button"
                onClick={copyShareUrl}
                aria-label={props.form.shareCopy}
                data-testid="home-hero-share-copy"
                className="inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-full bg-ks-green-700 px-4 text-sm font-semibold text-white"
              >
                {copied ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copied ? props.form.shareCopied : props.form.shareCopy}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
