'use client';

import { useState } from 'react';
import { ArrowUpRight, Briefcase, Cake, Check, Heart, Landmark } from 'lucide-react';
import { SiteLink as Link } from '@/components/site/site-link';
import { cn } from '@/lib/cn';
import { emit } from '@/lib/analytics-client';
import { THEME_GRADIENTS } from '@/lib/demo-card';
import { useCardImageSrc } from '@/lib/use-card-image';
import { PhoneCardMockup } from '@/components/site/home/phone-card-mockup';
import type { OccasionShowcaseCopy, OccasionTabCopy } from '@/content/home';

export interface OccasionShowcaseProps {
  copy: OccasionShowcaseCopy;
  primaryHref: string;
  jaribuBase: string;
  initialDateISO: string;
  locale: 'sw' | 'en';
}

const TAB_ICONS: Record<OccasionTabCopy['id'], typeof Briefcase> = {
  corporate: Briefcase,
  weddings: Heart,
  personal: Cake,
  community: Landmark,
};

function splitTitle(title: string): { partnerA: string; partnerB: string } {
  const parts = title.split(/\s*[&+]\s*/).filter(Boolean);
  if (parts.length >= 2) return { partnerA: parts[0]!, partnerB: parts[1]! };
  return { partnerA: title, partnerB: '' };
}

export function OccasionShowcase({
  copy,
  primaryHref,
  jaribuBase,
  initialDateISO,
  locale,
}: OccasionShowcaseProps) {
  const [activeId, setActiveId] = useState<OccasionTabCopy['id']>('corporate');
  const active = copy.tabs.find((t) => t.id === activeId) ?? copy.tabs[0];
  const { partnerA, partnerB } = splitTitle(active.demoNames);
  const { src: cardImgSrc } = useCardImageSrc({
    coupleNames: active.demoNames,
    partnerA,
    partnerB,
    eventKind: active.demoEventType,
    dateStart: `${initialDateISO}T14:00:00Z`,
    venueName: active.preview.venue,
    dressCode: active.id === 'corporate' ? 'Business Formal' : 'Smart Formal',
    themeId: active.preview.theme,
    coverGradient: THEME_GRADIENTS[active.preview.theme],
    guestName: active.preview.badge.split('·')[0]?.trim() || 'Guest',
    shortCode: active.preview.code,
    template: 'classic',
    seats: active.id === 'corporate' ? 1 : 2,
    locale,
  });

  const demoHref = `${jaribuBase}?names=${encodeURIComponent(active.demoNames)}&date=${encodeURIComponent(initialDateISO)}&event=${encodeURIComponent(active.demoEventType)}&theme=${encodeURIComponent(active.preview.theme)}`;

  return (
    <section aria-labelledby="occasion-showcase-title" className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-3 md:mb-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e3e8ee] bg-[#f6f9fc] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5469d4]">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#5469d4]" />
            {copy.eyebrow}
          </span>
          <h2
            id="occasion-showcase-title"
            className="max-w-3xl text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-[#0a2640] md:text-[42px]"
          >
            {copy.title}
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-[#494d59] md:text-lg">
            {copy.sub}
          </p>
        </div>

        {/* Category selector tabs */}
        <div
          role="tablist"
          aria-label={copy.eyebrow}
          className="scroll-row mb-6 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible"
        >
          {copy.tabs.map((tab) => {
            const Icon = TAB_ICONS[tab.id];
            const selected = tab.id === active.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                onClick={() => {
                  setActiveId(tab.id);
                  emit('home_occasion_tab', { tab: tab.id });
                }}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                  selected
                    ? 'bg-[#0a2640] text-white shadow-[0_10px_24px_-12px_rgb(10_38_64/0.55)]'
                    : 'border border-[#e3e8ee] bg-[#f6f9fc] text-[#0a2640] hover:border-[#5469d4]/40 hover:text-[#5469d4]',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{tab.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Active category panel */}
        <div role="tabpanel" id={`panel-${active.id}`} aria-labelledby={`tab-${active.id}`}>
          <div className="grid items-center gap-8 pt-4 md:grid-cols-[1.15fr_0.85fr] md:pt-6">
            {/* Left: Selling points */}
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5469d4]">
                  {active.eyebrow}
                </span>
                <h3 className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-[#0a2640] md:text-[32px]">
                  {active.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#494d59] md:text-base">{active.body}</p>
              </div>

              <ul className="flex flex-col gap-2.5 text-sm text-[#0a2640]">
                {active.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-[#5469d4]"
                      strokeWidth={2.2}
                      aria-hidden="true"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {active.note ? (
                <p className="rounded-xl border border-[#e3e8ee] bg-[#f6f9fc] px-3.5 py-2.5 text-xs font-medium text-[#494d59]">
                  {active.note}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={demoHref}
                  target="_blank"
                  rel="noopener"
                  onClick={() => emit('home_occasion_demo', { tab: active.id })}
                  className="qw-btn-primary text-sm"
                >
                  <span>{active.ctaLabel}</span>
                  <ArrowUpRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
                </a>
                <Link
                  href={primaryHref}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#e3e8ee] bg-white px-5 text-sm font-semibold text-[#0a2640] transition hover:border-[#5469d4]/40 hover:bg-[#f6f9fc]"
                >
                  <span>{copy.secondaryCta}</span>
                </Link>
              </div>
            </div>

            {/* Right: Phone mockup with real card preview fitted on screen */}
            <div className="flex justify-center md:justify-end">
              <PhoneCardMockup src={cardImgSrc} alt={active.preview.title} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
