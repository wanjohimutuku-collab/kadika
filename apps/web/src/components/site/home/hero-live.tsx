'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
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
 * Interactive hero that drives a realistic phone-frame preview from four inputs (names, date,
 * event kind, theme) and hands the secondary CTA a `/jaribu?...` deep link. A download button
 * paints the same card onto a 1080×1920 canvas and offers a PNG with the chosen theme intact.
 *
 * Preview updates on a 100 ms debounce. Analytics events (`home_hero_view`, `home_hero_input`,
 * `home_hero_theme`, `home_hero_cta_primary`, `home_hero_cta_secondary`, `home_hero_download`)
 * flow through `@/lib/analytics-client`.
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

/** Round-rect fallback for browsers without CanvasRenderingContext2D.roundRect. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
  const timer = useRef<number | null>(null);

  const themeId: ThemeId = useMemo(() => {
    if (themeChoice !== 'auto') return themeChoice;
    // Mirror DEMO_THEME_BY_EVENT without importing — light copy to keep the client bundle tiny.
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

  const downloadPng = useCallback(async () => {
    setDownloading(true);
    try {
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const [c0, c1] = THEME_STOPS[themeId];
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Decorative inner frame.
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      roundRect(ctx, 80, 120, W - 160, H - 240, 48);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Eyebrow.
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '600 36px system-ui, -apple-system, Segoe UI, sans-serif';
      const eyebrow = (props.form.eventLabels[eventType] ?? '').toUpperCase();
      ctx.fillText(eyebrow, W / 2, 400);

      // Couple names.
      ctx.fillStyle = '#fff';
      ctx.font = `700 120px Georgia, "Times New Roman", serif`;
      ctx.fillText(view.event?.coupleNames ?? '', W / 2, 760);

      // Date.
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = '400 56px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(datePretty, W / 2, 900);

      // Short-code pill.
      const pillW = 340;
      const pillH = 92;
      const pillX = (W - pillW) / 2;
      const pillY = H - 560;
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      roundRect(ctx, pillX, pillY, pillW, pillH, 46);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '600 38px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(view.guest?.shortCode ?? 'DEMO-0001', W / 2, pillY + pillH / 2 + 2);

      // Footer brand mark.
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '500 34px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText('kadisasa.co.tz', W / 2, H - 200);

      // Theme tag.
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '500 22px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(props.form.themeNames[themeId] ?? themeId, W / 2, H - 150);

      const blob: Blob | null = await new Promise((r) => canvas.toBlob((b) => r(b), 'image/png'));
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kadi-${slugify(view.event?.coupleNames ?? 'kadi')}-${themeId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      emit('home_hero_download', { themeId, eventType });
    } finally {
      setDownloading(false);
    }
  }, [
    themeId,
    eventType,
    datePretty,
    view.event?.coupleNames,
    view.guest?.shortCode,
    props.form.eventLabels,
    props.form.themeNames,
  ]);

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
            onClick={downloadPng}
            disabled={downloading}
            aria-label={props.form.downloadAria}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ks-ink/15 bg-white px-6 font-semibold text-ks-ink disabled:opacity-60"
          >
            <Download className="size-4" strokeWidth={2} aria-hidden="true" />
            {props.form.downloadCta}
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
          {/* Phone body — a scaled SVG shell draws bezel, side buttons, and the dynamic island. */}
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
    </section>
  );
}
