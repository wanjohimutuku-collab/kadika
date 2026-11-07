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
    <section className="relative bg-ks-green-900 py-20 text-white md:py-28">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 text-center">
        <h2 className="font-serif text-3xl leading-tight tracking-[-0.02em] md:text-4xl">
          {copy.text}
        </h2>
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <input
            type="tel"
            inputMode="tel"
            placeholder={copy.whatsappField}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 w-full max-w-sm rounded-full border border-white/40 bg-white/10 px-5 text-white placeholder-white/60"
            aria-label={copy.whatsappField}
          />
          <a
            href={buildWaUrl()}
            target="_blank"
            rel="noopener"
            onClick={() => emit('home_cta_whatsapp', { withPhone: digitsOnly(phone).length > 0 })}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 font-semibold text-ks-green-900"
          >
            {copy.whatsappCta}
          </a>
        </div>
        <a
          href={primaryHref}
          onClick={() => emit('home_cta_band_primary')}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/50 px-6 font-semibold"
        >
          {copy.primary}
        </a>
      </div>
    </section>
  );
}
