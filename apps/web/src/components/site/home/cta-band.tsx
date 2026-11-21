'use client';

import { useState } from 'react';
import { ArrowUpRight, QrCode } from 'lucide-react';
import { SiteLink as Link } from '@/components/site/site-link';
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
    <section id="get-started-section" className="px-4 pb-16 pt-4 md:px-6 md:pb-24">
      <div className="qw-navy-band relative mx-auto max-w-[1120px] overflow-hidden rounded-[2rem] border border-[#5469d4]/30 px-6 py-16 text-white shadow-[0_28px_60px_-24px_rgb(10_38_64/0.55)] md:px-14 md:py-20">
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-7 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#90e0ff]">
            <span aria-hidden="true" className="qw-ripple-dot" />
            {copy.badge}
          </span>
          <h2 className="text-[32px] font-bold leading-[1.08] tracking-[-0.025em] text-balance md:text-[48px]">
            {copy.text}
          </h2>
          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <input
              type="tel"
              inputMode="tel"
              placeholder={copy.whatsappField}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 w-full max-w-sm rounded-full border border-white/20 bg-white px-5 text-[#0a2640] placeholder-[#494d59] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5469d4]"
              aria-label={copy.whatsappField}
            />
            <a
              href={buildWaUrl()}
              target="_blank"
              rel="noopener"
              onClick={() => emit('home_cta_whatsapp', { withPhone: digitsOnly(phone).length > 0 })}
              className="qw-btn-primary"
            >
              <span>{copy.whatsappCta}</span>
              <ArrowUpRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={primaryHref}
              onClick={() => emit('home_cta_band_primary')}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 font-semibold text-[#0a2640] transition hover:bg-[#f6f9fc]"
            >
              <span>{copy.primary}</span>
              <ArrowUpRight className="size-4 text-[#5469d4]" aria-hidden="true" />
            </a>
            <Link
              href="/k"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 font-semibold text-white transition hover:bg-white/20"
            >
              <QrCode className="size-4" aria-hidden="true" />
              <span>{copy.secondary}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
