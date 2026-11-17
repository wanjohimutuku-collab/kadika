'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, Download, Share2, Sparkles, X } from 'lucide-react';
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

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
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
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
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

  const datePretty = useMemo(
    () =>
      new Date(dateISO).toLocaleDateString(props.locale === 'sw' ? 'sw-TZ' : 'en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    [dateISO, props.locale],
  );

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const label = props.form.eventLabels[eventType];
      const rsvpBadge = props.locale === 'sw' ? 'Thibitisha · RSVP' : 'Confirm · RSVP';
      const qrHint = props.locale === 'sw' ? 'Kadi ya Mwaliko' : 'Invitation Pass';
      setPreviewHtml(
        `<div class="relative flex h-full flex-col justify-between px-4 pb-5 pt-3 text-center">` +
          `<div class="flex flex-col items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-5 backdrop-blur-sm">` +
          `<span class="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/80">${escapeHtml(qrHint)}</span>` +
          `<span class="rounded-full bg-white/15 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">${escapeHtml(label)}</span>` +
          `<div class="my-2 flex flex-col gap-1.5">` +
          `<p class="font-serif text-[26px] leading-[1.08] tracking-tight text-white">${escapeHtml(view.event?.coupleNames ?? '')}</p>` +
          `<span class="mx-auto h-px w-12 bg-white/40"></span>` +
          `<p class="text-xs font-medium text-white/90">${escapeHtml(datePretty)}</p>` +
          `</div>` +
          `</div>` +
          `<div class="flex flex-col items-center gap-2.5">` +
          `<div class="flex w-full items-center justify-between rounded-xl border border-white/25 bg-black/25 px-3 py-2 text-left">` +
          `<div>` +
          `<p class="text-[8px] uppercase tracking-[0.18em] text-white/70">CODE</p>` +
          `<p class="font-mono text-xs font-bold tracking-[0.16em] text-white">${escapeHtml(view.guest?.shortCode ?? '')}</p>` +
          `</div>` +
          `<span class="rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold text-[#0a3f35]">${escapeHtml(rsvpBadge)}</span>` +
          `</div>` +
          `</div>` +
          `</div>`,
      );
    }, 100);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [view, eventType, props.form.eventLabels, props.locale, datePretty]);

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

  const screenGradient = THEME_GRADIENTS[themeId];

  return (
    <section
      id="jaribu-mwenyewe"
      aria-labelledby="jaribu-mwenyewe-heading"
      className="mx-auto max-w-[1120px] scroll-mt-24 px-4 py-12 md:px-6 md:py-16"
    >
      <div className="ks-bezel ks-reveal">
        <div className="ks-core grid overflow-hidden lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-between gap-6 p-6 md:p-10">
            <div className="flex flex-col gap-3">
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-ks-green-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ks-green-900">
                <Sparkles className="size-3.5 text-ks-gold-500" aria-hidden="true" />
                {props.eyebrow}
              </p>
              <h2
                id="jaribu-mwenyewe-heading"
                className="font-serif text-[30px] leading-[1.08] tracking-[-0.02em] text-ks-green-900 md:text-[40px]"
              >
                {props.h1}
              </h2>
              <p className="max-w-xl text-base leading-relaxed text-ks-muted">{props.sub}</p>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-ks-line bg-ks-paper/70 p-4 md:p-5">
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-ks-ink">
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
                  className="h-12 rounded-xl border border-ks-line bg-white px-4 text-base font-normal text-ks-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.03)] transition focus:border-ks-green-700 focus:outline-none"
                  aria-label={props.form.names}
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-ks-ink">
                  {props.form.date}
                  <input
                    type="date"
                    value={dateISO}
                    onChange={(e) => {
                      setDateISO(e.target.value);
                      emit('home_hero_input', { field: 'date' });
                    }}
                    className="h-12 rounded-xl border border-ks-line bg-white px-4 text-base font-normal text-ks-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.03)] transition focus:border-ks-green-700 focus:outline-none"
                    aria-label={props.form.date}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-ks-ink">
                  {props.form.eventType}
                  <select
                    value={eventType}
                    onChange={(e) => {
                      setEventType(e.target.value as DemoEventType);
                      emit('home_hero_input', { field: 'eventType' });
                    }}
                    className="h-12 rounded-xl border border-ks-line bg-white px-4 text-base font-normal text-ks-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.03)] transition focus:border-ks-green-700 focus:outline-none"
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

              <fieldset className="flex flex-col gap-2 pt-1">
                <legend className="text-sm font-semibold text-ks-ink">
                  {props.form.themeLabel}
                </legend>
                <div
                  className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
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
                          'group relative flex h-11 items-center gap-2 rounded-full border bg-white py-1 pr-3.5 pl-1.5 text-xs font-semibold transition ' +
                          (active
                            ? 'border-ks-green-700 ring-2 ring-ks-green-700/30'
                            : 'border-ks-line hover:border-ks-green-700/50')
                        }
                      >
                        <span
                          aria-hidden="true"
                          className="size-7 shrink-0 rounded-full border border-white/70 shadow-sm"
                          style={{ background: `linear-gradient(135deg,${s0},${s1})` }}
                        />
                        <span className="truncate text-ks-ink">{props.form.themeNames[t]}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            {/* Utility action row: open the full-template card in a new tab, download the SVG, or
                share. The primary conversion CTA ("Start free") lives on the Hero component above —
                this island is for "try it yourself", not for conversion. */}
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
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ks-green-900 px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-12px_rgb(10_63_53/0.6)] transition hover:bg-ks-ink"
              >
                {props.secondaryLabel}
                <ArrowUpRight
                  className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-px"
                  aria-hidden="true"
                />
              </a>
              <button
                type="button"
                onClick={downloadCard}
                disabled={downloading}
                aria-label={props.form.downloadAria}
                data-testid="home-hero-download"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ks-line bg-white px-4 text-sm font-semibold text-ks-ink transition hover:border-ks-green-700/40 disabled:opacity-60"
              >
                <Download className="size-4 text-ks-green-700" strokeWidth={2} aria-hidden="true" />
                {props.form.downloadCta}
              </button>
              <button
                ref={shareTriggerRef}
                type="button"
                onClick={shareCard}
                aria-label={props.form.shareAria}
                data-testid="home-hero-share"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ks-line bg-white px-4 text-sm font-semibold text-ks-ink transition hover:border-ks-green-700/40"
              >
                <Share2 className="size-4 text-ks-muted" strokeWidth={2} aria-hidden="true" />
                {props.form.shareCta}
              </button>
            </div>
          </div>

          <div className="ks-mesh-dark relative flex items-center justify-center px-6 py-10 md:px-8 md:py-12">
            <div
              aria-label={props.previewFrameAlt}
              role="img"
              className="relative"
              style={{ width: 270, height: 540 }}
            >
              {/* Phone body — a scaled SVG shell draws bezel, side buttons and the dynamic island. */}
              <svg
                viewBox="0 0 300 600"
                width={270}
                height={540}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 drop-shadow-[0_28px_48px_rgb(0_0_0/0.45)]"
              >
                <defs>
                  <linearGradient id="hl-bezel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1A1E1C" />
                    <stop offset="100%" stopColor="#0B0E0D" />
                  </linearGradient>
                </defs>
                {/* Side buttons — drawn behind the body so they peek out. */}
                <rect x="0" y="118" width="4" height="36" rx="2" fill="#141716" />
                <rect x="0" y="180" width="4" height="60" rx="2" fill="#141716" />
                <rect x="0" y="252" width="4" height="60" rx="2" fill="#141716" />
                <rect x="296" y="168" width="4" height="96" rx="2" fill="#141716" />
                {/* Outer frame. */}
                <rect x="4" y="4" width="292" height="592" rx="44" fill="url(#hl-bezel)" />
                {/* Inner bezel highlight. */}
                <rect
                  x="7"
                  y="7"
                  width="286"
                  height="586"
                  rx="41"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
                {/* Dynamic island. */}
                <rect x="120" y="22" width="60" height="18" rx="9" fill="#050707" />
                <circle cx="166" cy="31" r="2.2" fill="#1C2322" />
              </svg>
              {/* Screen area — matches the cutout inside the bezel. */}
              <div
                className="absolute overflow-hidden text-white"
                style={{
                  top: 13,
                  bottom: 13,
                  left: 13,
                  right: 13,
                  borderRadius: 31,
                  background: screenGradient,
                }}
              >
                {/* Status-bar spacer so content clears the dynamic island. */}
                <div className="h-9" aria-hidden="true" />
                <div
                  className="pointer-events-none h-[calc(100%-2.25rem)]"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
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
