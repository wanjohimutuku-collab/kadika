import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react';
import { SiteLink as Link } from '@/components/site/site-link';
import { cardImageRequest } from '@/lib/card-canvas';
import { PhoneCardMockup } from '@/components/site/home/phone-card-mockup';
import type { HeroStatCardsCopy } from '@/content/home';

/**
 * Quickwork.co-inspired Hero: animated slanted trapezoid gradient backdrop (.qw-hero-trapezoid),
 * deep navy (#0a2640) bold headline with indigo-blue gradient CTA (.qw-btn-primary),
 * live ripple indicator (.qw-ripple-dot), and right-side phone product stage.
 */

export interface HeroProps {
  h1: string;
  accentWord: string;
  sub: string;
  primary: { href: string; label: string };
  howHref: string;
  howLabel: string;
  guestCard?: { href: string; label: string };
  trustLine: string;
  kickerEvents: readonly [string, string, string, string, string, string];
  previewFrameAlt: string;
  statCards: HeroStatCardsCopy;
  capabilities?: readonly string[];
}

function splitOnAccent(h1: string, accent: string): [string, string, string, string] {
  if (!accent) return [h1, '', '', ''];
  const i = h1.toLowerCase().indexOf(accent.toLowerCase());
  if (i < 0) return [h1, '', '', ''];
  const rawPost = h1.slice(i + accent.length);
  const punctMatch = rawPost.match(/^[.,!?;:]+/);
  const punct = punctMatch ? punctMatch[0] : '';
  const post = rawPost.slice(punct.length);
  return [h1.slice(0, i), h1.slice(i, i + accent.length), punct, post];
}

export function Hero(props: HeroProps) {
  const [pre, accent, punct, post] = splitOnAccent(props.h1, props.accentWord);
  const s = props.statCards;
  const heroCardReq = cardImageRequest({
    coupleNames: 'Asha & Juma',
    partnerA: 'Asha',
    partnerB: 'Juma',
    eventKind: 'harusi',
    dateStart: '2026-12-14T13:00:00Z',
    venueName: `${s.previewVenueLine1} ${s.previewVenueLine2}`,
    dressCode: 'Formal',
    themeId: 'navy-silver',
    coverGradient: 'linear-gradient(135deg,#1F3A5F 0%,#8A96A3 100%)',
    guestName: 'Mwanaidi Salim',
    shortCode: 'KH-4826',
    template: 'classic',
    seats: 2,
    locale: 'en',
  });

  const channelPills = [
    { icon: MessageSquare, label: 'WhatsApp' },
    { icon: Smartphone, label: 'SMS' },
    { icon: FileText, label: 'A6 / A4 PDF' },
    { icon: QrCode, label: 'Offline QR' },
  ] as const;

  return (
    <section
      id="header-section"
      className="relative overflow-hidden border-b border-[#e3e8ee] bg-white"
    >
      {/* Quickwork.co signature animated slanted trapezoid gradient */}
      <div
        aria-hidden="true"
        className="qw-hero-trapezoid pointer-events-none absolute inset-x-0 top-0 h-[340px] opacity-25 md:h-[420px]"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pt-12 pb-16 md:grid-cols-[1.12fr_0.88fr] md:gap-12 md:pt-16 md:pb-24">
        {/* Left column: deep navy headline, accent gradient, primary CTA */}
        <div className="ks-enter flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-[#e3e8ee] bg-white/95 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0a2640] shadow-xs">
              <span aria-hidden="true" className="qw-ripple-dot" />
              {props.kickerEvents.slice(0, 4).join(' · ')}
            </span>
          </div>

          <h1 className="text-[38px] font-bold leading-[1.08] tracking-[-0.03em] text-[#0a2640] sm:text-[48px] lg:text-[56px]">
            {pre}
            {accent ? (
              <span className="whitespace-nowrap">
                <span className="bg-gradient-to-r from-[#4f46e5] via-[#5469d4] to-[#3b82f6] bg-clip-text text-transparent">
                  {accent}
                </span>
                {punct}
              </span>
            ) : null}
            {post}
          </h1>

          <p className="max-w-[34rem] text-base leading-relaxed text-[#494d59] sm:text-[18px] sm:leading-[1.65]">
            {props.sub}
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <Link href={props.primary.href} className="qw-btn-primary">
              <span>{props.primary.label}</span>
              <ArrowUpRight className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
            </Link>

            <Link
              href={props.howHref}
              className="inline-flex min-h-[3.125rem] items-center rounded-full border border-[#e3e8ee] bg-white px-5 text-[15px] font-semibold text-[#0a2640] shadow-xs transition hover:border-[#5469d4]/50 hover:bg-[#f6f9fc] hover:text-[#5469d4]"
            >
              {props.howLabel}
            </Link>

            {props.guestCard ? (
              <Link
                href={props.guestCard.href}
                className="inline-flex min-h-[3rem] items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#5469d4] underline decoration-[#5469d4]/35 underline-offset-4 transition hover:text-[#0a2640] hover:decoration-[#0a2640]"
              >
                <QrCode className="size-4" aria-hidden="true" />
                <span>{props.guestCard.label}</span>
              </Link>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-[13px] font-medium text-[#494d59]">
            <CheckCircle2 className="size-4 shrink-0 text-[#5469d4]" aria-hidden="true" />
            <span>{props.trustLine}</span>
          </div>

          {props.capabilities?.length ? (
            <ul className="grid grid-cols-1 gap-2.5 border-t border-[#e3e8ee] pt-5 sm:grid-cols-2">
              {props.capabilities.map((cap) => (
                <li
                  key={cap}
                  className="flex items-center gap-2.5 text-[13.5px] font-medium text-[#0a2640]/85"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#5469d4]/10 text-[#5469d4]"
                  >
                    <CheckCircle2 className="size-3.5" strokeWidth={2.2} />
                  </span>
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Right column: phone mockup + floating proof cards + channel strip */}
        <div className="ks-enter-2 relative flex flex-col items-center justify-center gap-5">
          <div className="relative flex w-full max-w-[27rem] items-center justify-center py-2">
            <PhoneCardMockup src={heroCardReq.url} alt={props.previewFrameAlt} />

            {/* Floating proof 1: Guest RSVP funnel */}
            <div className="absolute -left-6 top-8 hidden w-48 rounded-2xl border border-[#e3e8ee] bg-white/95 p-3.5 shadow-[0_18px_40px_-14px_rgb(10_38_64/0.18)] backdrop-blur sm:block">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#494d59]">
                  {s.guestsTitle}
                </span>
                <Users className="size-3.5 text-[#5469d4]" aria-hidden="true" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-sm font-bold text-[#0a2640]">{s.guestsConfirmed}</span>
                <span className="text-[11px] font-medium text-[#494d59]">{s.guestsInvited}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#eff2f7]">
                <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#3b82f6]" />
              </div>
            </div>

            {/* Floating proof 2: Offline QR Gate */}
            <div className="absolute -right-6 top-24 hidden w-48 rounded-2xl border border-[#e3e8ee] bg-white/95 p-3.5 shadow-[0_18px_40px_-14px_rgb(10_38_64/0.18)] backdrop-blur sm:block">
              <div className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#5469d4]/10 text-[#5469d4]">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-xs font-bold text-[#0a2640]">
                    {s.checkedInTitle}
                  </span>
                  <span className="block truncate text-[11px] font-medium text-[#0f7a47]">
                    {s.checkedInOffline}
                  </span>
                </div>
              </div>
            </div>

            {/* Floating proof 3: Michango / Pledge ledger */}
            <div className="absolute -left-4 bottom-8 hidden w-52 rounded-2xl border border-[#e3e8ee] bg-white/95 p-3.5 shadow-[0_18px_40px_-14px_rgb(10_38_64/0.18)] backdrop-blur sm:block">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#494d59]">
                  {s.michangoTitle}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f6f9fc] px-2 py-0.5 text-[10px] font-bold text-[#5469d4]">
                  <Wallet className="size-3" aria-hidden="true" />
                  {s.michangoPercent}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-bold text-[#0a2640]">
                {s.michangoReceivedAmount}
              </div>
              <div className="text-[11px] text-[#494d59]">
                {s.michangoPledged}: {s.michangoPledgedAmount}
              </div>
            </div>
          </div>

          {/* Channel badge strip */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {channelPills.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e3e8ee] bg-white/95 px-3 py-1 text-xs font-semibold text-[#0a2640]/85 shadow-xs"
              >
                <Icon className="size-3.5 text-[#5469d4]" aria-hidden="true" />
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
