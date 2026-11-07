'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Share2, X } from 'lucide-react';
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
  h1: string;
  sub: string;
  primary: { href: string; label: string };
  secondaryBaseHref: string;
  secondaryLabel: string;
  footnote: string;
  form: HomeHeroFormLabels;
  previewFrameAlt: string;
}

export function HeroLive(props: HeroLiveProps) {
  const [names, setNames] = useState('Asha & Juma');
  const [dateISO, setDateISO] = useState(nextSaturdayISO());
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
      setPreviewHtml(
        `<div class="flex h-full flex-col items-center justify-between px-6 pt-8 pb-7 text-center">` +
          `<span class="text-[11px] uppercase tracking-[0.3em] opacity-85">${escapeHtml(label)}</span>` +
          `<div class="flex flex-col gap-2">` +
          `<p class="font-serif text-[30px] leading-tight">${escapeHtml(view.event?.coupleNames ?? '')}</p>` +
          `<p class="text-sm opacity-90">${escapeHtml(datePretty)}</p>` +
          `</div>` +
          `<span class="rounded-full border border-white/40 bg-white/10 px-3 py-1 text-[11px] tracking-[0.25em]">${escapeHtml(view.guest?.shortCode ?? '')}</span>` +
          `</div>`,
      );
    }, 100);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [view, eventType, props.form.eventLabels, datePretty]);

  const secondaryHref = `${props.secondaryBaseHref}?names=${encodeURIComponent(
    names,
  )}&date=${encodeURIComponent(dateISO)}&event=${encodeURIComponent(eventType)}${
    themeChoice !== 'auto' ? `&theme=${encodeURIComponent(themeChoice)}` : ''
  }`;

  const shareTitle = useMemo(
    () => view.event?.coupleNames ?? 'Kadi',
    [view.event?.coupleNames],
  );

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
    <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:gap-16 md:py-24">
      <div className="flex flex-col gap-6">
        <h1 className="font-serif text-4xl leading-[1.08] tracking-[-0.02em] md:text-5xl">
          {props.h1}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-ks-muted">{props.sub}</p>

        <div className="flex flex-col gap-3 pt-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
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
              className="h-12 rounded-ks border border-ks-border bg-white px-4 text-base"
              aria-label={props.form.names}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              {props.form.date}
              <input
                type="date"
                value={dateISO}
                onChange={(e) => {
                  setDateISO(e.target.value);
                  emit('home_hero_input', { field: 'date' });
                }}
                className="h-12 rounded-ks border border-ks-border bg-white px-4 text-base"
                aria-label={props.form.date}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {props.form.eventType}
              <select
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value as DemoEventType);
                  emit('home_hero_input', { field: 'eventType' });
                }}
                className="h-12 rounded-ks border border-ks-border bg-white px-4 text-base"
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

          <fieldset className="flex flex-col gap-2 pt-2">
            <legend className="text-sm font-medium">{props.form.themeLabel}</legend>
            <div
              className="flex flex-wrap gap-2"
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
                      'group relative h-10 min-w-[120px] overflow-hidden rounded-full border px-3 text-xs font-medium transition ' +
                      (active
                        ? 'border-ks-green-700 ring-2 ring-ks-green-700/40'
                        : 'border-ks-border hover:border-ks-green-700/50')
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1 left-1 size-7 rounded-full border border-white/60"
                      style={{ background: `linear-gradient(135deg,${s0},${s1})` }}
                    />
                    <span className="relative ml-8 inline-flex items-center text-ks-ink">
                      {props.form.themeNames[t]}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <a
            href={props.primary.href}
            onClick={() => emit('home_hero_cta_primary')}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-ks-green-700 px-6 font-semibold text-white"
          >
            {props.primary.label}
          </a>
          <a
            href={secondaryHref}
            target="_blank"
            rel="noopener"
            onClick={() => emit('home_hero_cta_secondary')}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ks-green-700 px-6 font-semibold text-ks-green-700"
          >
            {props.secondaryLabel}
          </a>
          <button
            type="button"
            onClick={downloadCard}
            disabled={downloading}
            aria-label={props.form.downloadAria}
            data-testid="home-hero-download"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ks-ink/15 bg-white px-6 font-semibold text-ks-ink disabled:opacity-60"
          >
            <Download className="size-4" strokeWidth={2} aria-hidden="true" />
            {props.form.downloadCta}
          </button>
          <button
            ref={shareTriggerRef}
            type="button"
            onClick={shareCard}
            aria-label={props.form.shareAria}
            data-testid="home-hero-share"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ks-ink/15 bg-white px-6 font-semibold text-ks-ink"
          >
            <Share2 className="size-4" strokeWidth={2} aria-hidden="true" />
            {props.form.shareCta}
          </button>
        </div>
        <p className="text-sm text-ks-muted">{props.footnote}</p>
      </div>

      <div className="flex justify-center md:justify-end">
        <div
          aria-label={props.previewFrameAlt}
          role="img"
          className="relative"
          style={{ width: 300, height: 600 }}
        >
          {/* Phone body — a scaled SVG shell draws bezel, side buttons and the dynamic island. */}
          <svg
            viewBox="0 0 300 600"
            width={300}
            height={600}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 drop-shadow-[0_28px_48px_rgb(10_63_53/0.35)]"
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
              top: 14,
              bottom: 14,
              left: 14,
              right: 14,
              borderRadius: 34,
              background: screenGradient,
            }}
          >
            {/* Status-bar spacer so content clears the dynamic island. */}
            <div className="h-10" aria-hidden="true" />
            <div
              className="pointer-events-none h-[calc(100%-2.5rem)]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
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
