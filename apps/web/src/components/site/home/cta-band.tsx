'use client';

import { useState } from 'react';
import { emit } from '@/lib/analytics-client';
import type { HomeCopy } from '@/content/home';

/**
 * Closing CTA band with a WhatsApp share composer. No backend: the button builds a
 * `wa.me/<digits>?text=…` URL on click. An empty phone falls through to `wa.me/?text=…` so the
 * visitor picks the recipient themselves.
 */

export interface CtaBandProps {
  copy: HomeCopy['ctaBand'];
  primaryHref: string;
  demoHref: string;
}

function digitsOnly(s: string): string {
  return s.replace(/[^\d]/g, '');
}

export function CtaBand({ copy, primaryHref, demoHref }: CtaBandProps) {
  const [phone, setPhone] = useState('');

  function buildWaUrl(): string {
    const to = digitsOnly(phone);
    const text = encodeURIComponent(copy.whatsappTemplate.replace('{url}', demoHref));
    return to ? `https://wa.me/${to}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  return (
    <section className="ks-mesh-hot relative overflow-hidden py-20 text-ks-green-900 md:py-24">
      {/* Saffron kitenge chevron strip tops the band — bookends the page with the hero. */}
      <div
        aria-hidden="true"
        className="ks-kitenge pointer-events-none absolute inset-x-0 top-0 h-1.5 opacity-85"
      />
      {/* An oversized serif ampersand loiters in the lower-left as a brush of atmosphere. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -bottom-24 select-none font-serif text-[24rem] leading-none text-ks-green-900/10"
      >
        &amp;
      </span>
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-7 px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-ks-green-900/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ks-green-900" />
          {copy.badge}
        </span>
        <h2 className="font-serif text-[32px] leading-[1.05] tracking-[-0.02em] text-balance md:text-[52px]">
          {copy.text}
        </h2>
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <input
            type="tel"
            inputMode="tel"
            placeholder={copy.whatsappField}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 w-full max-w-sm rounded-full border border-ks-green-900/20 bg-white/85 px-5 text-ks-ink placeholder-ks-ink/50 shadow-[inset_0_1px_2px_rgb(0_0_0/0.05)] focus:outline-none focus:ring-2 focus:ring-ks-green-900/40"
            aria-label={copy.whatsappField}
          />
          <a
            href={buildWaUrl()}
            target="_blank"
            rel="noopener"
            onClick={() => emit('home_cta_whatsapp', { withPhone: digitsOnly(phone).length > 0 })}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-ks-green-900 px-6 font-semibold text-white shadow-[0_14px_30px_-14px_rgb(10_63_53/0.6)] transition hover:bg-ks-ink"
          >
            {copy.whatsappCta}
          </a>
        </div>
        <a
          href={primaryHref}
          onClick={() => emit('home_cta_band_primary')}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-white/80 px-6 font-semibold text-ks-green-900 shadow-[inset_0_0_0_1px_rgb(10_63_53/0.2)] transition hover:bg-white"
        >
          {copy.primary}
        </a>
      </div>
    </section>
  );
}
