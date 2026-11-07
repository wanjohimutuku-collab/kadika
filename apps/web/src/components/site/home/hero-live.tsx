'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildDemoCardView, DEMO_EVENT_TYPES, type DemoEventType } from '@/lib/demo-card';
import { cn } from '@/lib/cn';
import { emit, hashShort } from '@/lib/analytics-client';
import type { HomeHeroFormLabels } from '@/content/home';

/**
 * Interactive hero that drives a scaled phone-frame preview from three inputs and hands the
 * secondary CTA a `/jaribu?...` deep link. Preview updates on a 100 ms debounce. Analytics
 * events (`home_hero_view`, `home_hero_input`, `home_hero_cta_primary`,
 * `home_hero_cta_secondary`) flow through `@/lib/analytics-client`.
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
  const [cardHtml, setCardHtml] = useState<string>('');
  const timer = useRef<number | null>(null);

  const view = useMemo(
    () => buildDemoCardView({ names, dateISO, eventType }),
    [names, dateISO, eventType],
  );

  useEffect(() => {
    emit('home_hero_view');
  }, []);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const label = props.form.eventLabels[eventType];
      const datePretty = new Date(dateISO).toLocaleDateString(
        props.locale === 'sw' ? 'sw-TZ' : 'en-GB',
        { day: '2-digit', month: 'long', year: 'numeric' },
      );
      setCardHtml(
        `<div class="flex h-full flex-col items-center justify-between p-6 text-center">` +
          `<span class="text-xs uppercase tracking-widest opacity-80">${escapeHtml(label)}</span>` +
          `<div class="flex flex-col gap-2">` +
          `<p class="font-serif text-3xl leading-tight">${escapeHtml(view.event?.coupleNames ?? '')}</p>` +
          `<p class="text-sm opacity-90">${escapeHtml(datePretty)}</p>` +
          `</div>` +
          `<span class="rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs tracking-widest">${escapeHtml(view.guest?.shortCode ?? '')}</span>` +
          `</div>`,
      );
    }, 100);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [view, eventType, dateISO, props.locale, props.form.eventLabels]);

  const secondaryHref = `${props.secondaryBaseHref}?names=${encodeURIComponent(
    names,
  )}&date=${encodeURIComponent(dateISO)}&event=${encodeURIComponent(eventType)}`;
  const coverStyle: Record<string, string> = view.event?.coverGradient
    ? { background: view.event.coverGradient }
    : {};

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
        </div>
        <p className="text-sm text-ks-muted">{props.footnote}</p>
      </div>

      <div className="flex justify-center md:justify-end">
        <div
          aria-label={props.previewFrameAlt}
          className={cn(
            'relative h-[520px] w-[280px] overflow-hidden rounded-[2rem] border border-ks-border bg-ks-bg shadow-[0_18px_40px_-16px_rgb(10_63_53/0.4)]',
          )}
          style={coverStyle}
        >
          <div
            className="pointer-events-none h-full w-full text-white"
            dangerouslySetInnerHTML={{ __html: cardHtml }}
          />
        </div>
      </div>
    </section>
  );
}
