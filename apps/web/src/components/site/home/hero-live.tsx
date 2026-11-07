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
import { renderCard, shell } from '@/lib/light-card/render';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import type { ThemeId } from '@harusi/ui-tokens/themes';
import { emit, hashShort } from '@/lib/analytics-client';
import type { HomeHeroFormLabels } from '@/content/home';
import type { CardView } from '@harusi/api-client';

/**
 * Interactive hero. Four inputs (names, date, event kind, theme) drive a live preview rendered
 * into a drawn phone body, and the secondary CTA hands a `/jaribu?...` deep link to the real
 * guest card. The Download button captures the full `renderCard + shell` template (same code
 * path `/jaribu` uses) into a PNG via an SVG `foreignObject`, so the file matches the chosen
 * theme end-to-end: trust strip, cover, RSVP, QR, short code, pledge summary, brand footer.
 */

const CARD_PNG_WIDTH = 1080;
const CARD_PNG_HEIGHT = 1920;

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

/**
 * Build the exact `/jaribu` document for a view, then hand it to the browser as an SVG download
 * that carries the complete card template. We ship SVG (not a raster PNG) because Chrome taints
 * any canvas that drew foreignObject content, so `canvas.toBlob` throws — and the SVG is the
 * truest representation anyway: vector, infinitely scalable, inline CSS, inline QR, every
 * element of the real `renderCard + shell` output.
 */
async function renderDemoCardToSvg(opts: {
  view: CardView;
  locale: 'sw' | 'en';
  themeId: ThemeId;
  filename: string;
}): Promise<void> {
  const { view, locale, filename } = opts;
  const palette = resolvePalette(view.event?.themeId, view.event?.palette);
  const inner = renderCard(view, {
    token: 'demo',
    locale,
    domain: 'kadisasa.co.tz',
    mode: 'mock',
    apiUrl: 'https://kadisasa.co.tz',
  });
  const doc = shell({ locale, title: 'Kadi', palette, body: inner });

  // Pull the inlined <style> and the sanitised body out of the document so we can drop them
  // inside an <svg><foreignObject>...</foreignObject></svg> wrapper. Scripts are removed because
  // foreignObject needs XHTML-well-formed content and the card's CLIENT_SCRIPT uses raw `<` / `&`.
  const parsed = new DOMParser().parseFromString(doc, 'text/html');
  const styleBlocks = Array.from(parsed.head.querySelectorAll('style'))
    .map((s) => s.textContent ?? '')
    .join('\n');
  parsed.body.querySelectorAll('script').forEach((n) => n.remove());
  const serializer = new XMLSerializer();
  const bodyXml = Array.from(parsed.body.childNodes)
    .map((n) => serializer.serializeToString(n))
    .join('');
  const styleCdata = `/*<![CDATA[*/${styleBlocks}/*]]>*/`;
  const bgColor = escapeHtml(palette.bg);
  const w = CARD_PNG_WIDTH;
  const h = CARD_PNG_HEIGHT;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<foreignObject x="0" y="0" width="${w}" height="${h}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;background:${bgColor};font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;align-items:flex-start;justify-content:center;overflow:hidden">` +
    `<style>${styleCdata}</style>` +
    `<div style="width:640px;transform:scale(1.25);transform-origin:top center">${bodyXml}</div>` +
    `</div></foreignObject></svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Delay revoke so the browser can finish fetching the blob for download.
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
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

  const downloadCard = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
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
    </section>
  );
}
