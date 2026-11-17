import { ArrowUpRight, CheckCircle2, Play, QrCode, Users, Wallet, Wifi } from 'lucide-react';
import { SiteLink as Link } from '@/components/site/site-link';
import type { HeroStatCardsCopy } from '@/content/home';

/**
 * The home hero's marketing surface: celebration kicker chips, editorial serif headline with
 * a saffron-brushed accent word, concise subtitle, primary conversion CTA with button-in-button
 * arrow, secondary "how it works" pill, and a tight trust line.
 *
 * The right stage pairs a warm architectural arch backdrop, a tilted physical paper card peek
 * (reinforcing WhatsApp + SMS + print), a flagship phone showing the Asha & Juma demo card, and
 * three orbiting product proof cards (guest funnel, Michango progress, offline gate check-in).
 *
 * Interactive editing (names, date, theme, download, share) lives in the `HeroLive` island
 * below, keeping the hero a fast, zero-JS Server Component conversion surface.
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
  // Keep any immediately following punctuation (e.g. ".") glued to the accent word so it never orphans on a new line.
  const punctMatch = rawPost.match(/^[.,!?;:]+/);
  const punct = punctMatch ? punctMatch[0] : '';
  const post = rawPost.slice(punct.length);
  return [h1.slice(0, i), h1.slice(i, i + accent.length), punct, post];
}

const KICKER_COLORS = [
  'bg-ks-magenta',
  'bg-ks-saffron',
  'bg-ks-green-700',
  'bg-ks-indigo',
  'bg-ks-terracotta',
  'bg-ks-magenta',
] as const;

export function Hero(props: HeroProps) {
  const [pre, accent, punct, post] = splitOnAccent(props.h1, props.accentWord);
  const s = props.statCards;

  return (
    <section className="ks-mesh relative overflow-hidden border-b border-ks-line/60">
      {/* Top kitenge chevron thread — bookends the page with the CtaBand at the bottom. */}
      <div
        aria-hidden="true"
        className="ks-kitenge pointer-events-none absolute inset-x-0 top-0 h-1.5 opacity-80"
      />

      {/* Subtle ambient light bloom behind the stage */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-12 h-[32rem] w-[32rem] rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle, rgb(232 149 48 / 0.22) 0%, rgb(200 31 106 / 0.08) 45%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pt-10 pb-14 md:grid-cols-[1.06fr_0.94fr] md:gap-10 md:pt-14 md:pb-20 lg:gap-14">
        {/* Left column: editorial copy & conversion */}
        <div className="ks-enter flex flex-col gap-6">
          {/* Celebration chips — every occasion in its kanga color key */}
          <ul className="flex flex-wrap items-center gap-2">
            {props.kickerEvents.map((label, i) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-ks-line/90 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ks-ink/85 shadow-[0_2px_8px_-4px_rgb(26_31_29/0.12)] backdrop-blur-sm"
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${KICKER_COLORS[i] ?? 'bg-ks-magenta'}`}
                />
                {label}
              </li>
            ))}
          </ul>

          <h1 className="font-serif text-[38px] leading-[1.03] tracking-[-0.03em] text-ks-ink sm:text-[48px] lg:text-[56px] xl:text-[60px]">
            {pre}
            {accent ? (
              <span className="whitespace-nowrap">
                <span className="relative inline-block italic text-ks-magenta">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-x-1 bottom-1 top-[42%] -z-10 -rotate-1 rounded-sm bg-ks-saffron-100/80"
                  />
                  {accent}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 200 14"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute -bottom-1 left-0 h-[0.3em] w-full text-ks-saffron"
                  >
                    <path
                      d="M3 9 Q 52 2 102 7 Q 152 12 197 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                {punct}
              </span>
            ) : null}
            {post}
          </h1>

          <p className="max-w-[34rem] text-base leading-relaxed text-ks-ink/80 sm:text-[18px] sm:leading-[1.6]">
            {props.sub}
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-1 sm:gap-4">
            <Link
              href={props.primary.href}
              className="group relative inline-flex min-h-[3.35rem] items-center justify-center gap-3 overflow-hidden rounded-full bg-ks-green-900 py-1.5 pl-7 pr-2 text-base font-semibold text-white shadow-[0_20px_42px_-14px_rgb(10_63_53/0.6)] transition-all duration-500 ks-ease hover:bg-ks-ink active:scale-[0.98]"
            >
              {/* Saffron light sweep on hover */}
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-ks-saffron/0 via-ks-saffron/35 to-ks-saffron/0 transition-transform duration-700 group-hover:translate-x-full"
              />
              <span className="relative">{props.primary.label}</span>
              <span
                aria-hidden="true"
                className="relative flex size-9 items-center justify-center rounded-full bg-white/15 text-white transition-all duration-500 ks-ease group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:bg-ks-saffron group-hover:text-ks-ink"
              >
                <ArrowUpRight className="size-[18px]" strokeWidth={2} />
              </span>
            </Link>

            <Link
              href={props.howHref}
              className="group inline-flex min-h-[3.35rem] items-center gap-2.5 rounded-full border border-ks-line bg-white/85 py-1.5 pl-2 pr-5 text-[15px] font-semibold text-ks-ink shadow-[0_8px_20px_-12px_rgb(26_31_29/0.2)] backdrop-blur-sm transition-all duration-300 hover:border-ks-green-700/35 hover:bg-white"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-ks-saffron text-ks-ink shadow-[0_6px_14px_-5px_rgb(232_149_48/0.75)] transition-transform duration-300 group-hover:scale-105">
                <Play
                  className="size-3.5 translate-x-[0.5px] fill-ks-ink"
                  strokeWidth={0}
                  aria-hidden="true"
                />
              </span>
              <span>{props.howLabel}</span>
            </Link>

            {props.guestCard ? (
              <Link
                href={props.guestCard.href}
                className="inline-flex min-h-[3rem] items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-ks-green-900 underline decoration-ks-green-700/35 underline-offset-4 transition hover:text-ks-green-700 hover:decoration-ks-green-700"
              >
                <QrCode className="size-4 text-ks-green-700" aria-hidden="true" />
                <span>{props.guestCard.label}</span>
              </Link>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-ks-green-100/80 px-3.5 py-1.5 text-[13px] font-medium text-ks-green-900 ring-1 ring-ks-green-700/15">
              <CheckCircle2 className="size-4 shrink-0 text-ks-green-700" aria-hidden="true" />
              <span>{props.trustLine}</span>
            </span>
          </div>

          {props.capabilities?.length ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ks-line/80 pt-4 text-[13px] font-medium text-ks-muted sm:grid-cols-2">
              {props.capabilities.map((cap) => (
                <li key={cap} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full bg-ks-gold-500"
                  />
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Right column: layered editorial product stage */}
        <div className="ks-enter-2 relative mx-auto flex w-full max-w-[490px] flex-col items-center justify-center gap-6 md:min-h-[590px]">
          {/* Architectural arch backdrop with gold hairline */}
          <div
            aria-hidden="true"
            className="absolute inset-x-5 bottom-4 top-6 hidden rounded-t-[13rem] rounded-b-[2.5rem] bg-gradient-to-b from-ks-saffron-100/85 via-white/85 to-ks-magenta-100/55 shadow-[inset_0_0_0_1px_rgb(217_164_65/0.28),0_28px_60px_-36px_rgb(10_63_53/0.25)] md:block"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-8 bottom-7 top-9 hidden rounded-t-[12rem] rounded-b-[2rem] border border-dashed border-ks-gold-500/30 md:block"
          />

          {/* Tilted physical paper kadi peeking behind the phone (desktop) */}
          <div
            aria-hidden="true"
            className="absolute right-3 top-14 z-0 hidden h-[240px] w-[168px] rotate-[8deg] flex-col justify-between rounded-2xl border border-ks-gold-500/45 bg-[#FBF8F1] p-3.5 shadow-[0_22px_40px_-20px_rgb(26_31_29/0.35)] md:flex lg:right-1"
          >
            <div className="flex items-center justify-between border-b border-ks-gold-500/25 pb-2">
              <span className="h-1.5 w-8 rounded-full bg-ks-gold-500/50" />
              <span className="font-mono text-[9px] font-semibold tracking-wider text-ks-green-900">
                KH-4826
              </span>
            </div>
            <div className="my-auto text-center">
              <p className="font-serif text-[13px] italic text-ks-green-900/75">
                {s.previewEyebrow}
              </p>
              <p className="mt-1 font-serif text-lg leading-tight text-ks-green-900">
                Asha <span className="italic text-ks-gold-500">&amp;</span> Juma
              </p>
            </div>
            <div className="h-2 w-full rounded-full ks-kanga opacity-80" />
          </div>

          {/* Floating card 1 (top-left): Guest list funnel */}
          <div className="absolute left-0 top-4 z-20 hidden w-[12.25rem] rounded-2xl bg-white/95 p-3.5 shadow-[0_22px_44px_-16px_rgb(200_31_106/0.32),inset_0_0_0_1px_rgb(200_31_106/0.16)] backdrop-blur-md md:block lg:-left-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-ks-magenta">
                <Users className="size-3.5" aria-hidden="true" />
                {s.guestsTitle}
              </span>
              <span className="tabular rounded-full bg-ks-magenta-100 px-1.5 py-0.5 text-[10px] font-bold text-ks-magenta">
                67%
              </span>
            </div>
            <div
              aria-hidden="true"
              className="mt-2.5 flex h-1.5 w-full overflow-hidden rounded-full bg-ks-line/70"
            >
              <span className="h-full w-[67%] bg-ks-green-700" />
              <span className="h-full w-[33%] bg-ks-magenta/35" />
            </div>
            <ul className="tabular mt-2.5 space-y-1 text-[13px] font-medium text-ks-ink">
              <li className="flex items-center justify-between">
                <span className="text-ks-muted">{s.guestsInvited}</span>
                <span className="size-1.5 rounded-full bg-ks-ink/25" aria-hidden="true" />
              </li>
              <li className="flex items-center justify-between font-semibold text-ks-green-700">
                <span>{s.guestsConfirmed}</span>
                <span className="size-1.5 rounded-full bg-ks-green-700" aria-hidden="true" />
              </li>
              <li className="flex items-center justify-between text-ks-muted">
                <span>{s.guestsAwaiting}</span>
                <span className="size-1.5 rounded-full bg-ks-magenta/50" aria-hidden="true" />
              </li>
            </ul>
          </div>

          {/* Centerpiece: Flagship phone body */}
          <div
            aria-label={props.previewFrameAlt}
            role="img"
            className="relative z-10 shrink-0"
            style={{ width: 286, height: 576 }}
          >
            <svg
              viewBox="0 0 300 604"
              width={286}
              height={576}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 drop-shadow-[0_34px_56px_rgb(10_63_53/0.4)]"
            >
              <defs>
                <linearGradient id="hero-titanium" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4A514E" />
                  <stop offset="22%" stopColor="#232826" />
                  <stop offset="50%" stopColor="#3B413E" />
                  <stop offset="80%" stopColor="#1B1F1E" />
                  <stop offset="100%" stopColor="#2E3431" />
                </linearGradient>
                <linearGradient id="hero-bezel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#121614" />
                  <stop offset="100%" stopColor="#050706" />
                </linearGradient>
              </defs>
              {/* Left side buttons */}
              <rect x="0.5" y="106" width="3.5" height="24" rx="1.75" fill="#2F3532" />
              <rect x="0.5" y="150" width="3.5" height="44" rx="1.75" fill="#2F3532" />
              <rect x="0.5" y="206" width="3.5" height="44" rx="1.75" fill="#2F3532" />
              {/* Right side button */}
              <rect x="296" y="168" width="3.5" height="68" rx="1.75" fill="#2F3532" />
              {/* Outer metallic chassis */}
              <rect x="3" y="2" width="294" height="600" rx="48" fill="url(#hero-titanium)" />
              {/* Inner dark glass bezel */}
              <rect x="6" y="5" width="288" height="594" rx="45" fill="url(#hero-bezel)" />
              {/* Subtle specular inner rim */}
              <rect
                x="7"
                y="6"
                width="286"
                height="592"
                rx="44"
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1"
              />
            </svg>

            {/* Screen viewport inside bezel */}
            <div
              className="absolute flex flex-col overflow-hidden"
              style={{
                top: 13,
                bottom: 13,
                left: 13,
                right: 13,
                borderRadius: 36,
                background:
                  'radial-gradient(120% 80% at 15% 0%, #1b7764 0%, #0F5C4D 55%, #0a3f35 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
              }}
            >
              {/* Diagonal glass reflection sheen */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20"
                style={{
                  background:
                    'linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 28%, transparent 45%)',
                }}
              />

              {/* Status bar + Dynamic Island */}
              <div
                aria-hidden="true"
                className="relative z-10 flex h-11 shrink-0 items-center justify-between px-5 pt-1 text-[10px] font-semibold tracking-tight text-white/95"
              >
                <span>9:41</span>
                <div className="flex h-[20px] w-[78px] items-center justify-end rounded-full bg-[#050707] px-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                  <span
                    className="size-2.5 rounded-full"
                    style={{
                      background:
                        'radial-gradient(circle at 38% 35%, #55A6CE 0%, #132A3E 48%, #040608 100%)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex items-end gap-[1.5px]">
                    <span className="h-[3px] w-[2px] rounded-[0.5px] bg-white" />
                    <span className="h-[5px] w-[2px] rounded-[0.5px] bg-white" />
                    <span className="h-[7px] w-[2px] rounded-[0.5px] bg-white" />
                    <span className="h-[9px] w-[2px] rounded-[0.5px] bg-white/45" />
                  </span>
                  <Wifi className="size-3 text-white" strokeWidth={2.2} />
                  <span className="inline-flex h-[10px] w-[18px] items-center rounded-[2.5px] border border-white/80 p-[1px]">
                    <span className="h-full w-[78%] rounded-[1px] bg-white" />
                  </span>
                </div>
              </div>

              {/* Ornamental inner invitation card */}
              <div className="relative mx-3 mb-2.5 mt-0.5 flex flex-1 flex-col justify-between overflow-hidden rounded-[22px] bg-[#FBF8F1] text-center text-ks-ink shadow-[0_16px_34px_-12px_rgb(0_0_0/0.45)]">
                {/* Subtle parchment radial warmth + inner hairline border */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(90% 55% at 50% 34%, rgba(217,164,65,0.12) 0%, transparent 70%)',
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-2 rounded-[16px] border border-ks-gold-500/20"
                />

                {/* Gold L-bracket corner ornaments */}
                {(
                  [
                    ['left-1.5 top-1.5', ''],
                    ['right-1.5 top-1.5', '-scale-x-100'],
                    ['left-1.5 bottom-1.5', '-scale-y-100'],
                    ['right-1.5 bottom-1.5', '-scale-100'],
                  ] as const
                ).map(([pos, flip], i) => (
                  <svg
                    key={i}
                    aria-hidden="true"
                    viewBox="0 0 40 40"
                    className={`pointer-events-none absolute ${pos} ${flip} size-9 text-ks-gold-500`}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                  >
                    <path d="M4 36 L4 10 Q 4 4 10 4 L36 4" strokeWidth="1.4" />
                    <path d="M9 32 L9 14 Q 9 9 14 9 L32 9" strokeWidth="0.9" opacity=".55" />
                    <g transform="translate(14 14)" stroke="none" fill="currentColor">
                      <path d="M0 -3 L0.65 -0.65 L3 0 L0.65 0.65 L0 3 L-0.65 0.65 L-3 0 L-0.65 -0.65 Z" />
                    </g>
                  </svg>
                ))}

                {/* Top section: Guest pass header + monogram crest */}
                <div className="relative flex flex-col items-center px-4 pt-4">
                  {/* Personal guest badge — shows every card is issued to a named guest */}
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-ks-green-700/15 bg-ks-green-100/80 px-2.5 py-0.5 text-[9px] font-semibold tracking-wide text-ks-green-900">
                    <span className="size-1.5 rounded-full bg-ks-green-700" aria-hidden="true" />
                    <span>Mwanaidi Salim · ×2</span>
                  </div>

                  {/* Monogram wax-seal style crest */}
                  <div
                    aria-hidden="true"
                    className="mt-2.5 flex size-9 items-center justify-center rounded-full border border-ks-gold-500/45 bg-gradient-to-br from-ks-green-700 to-ks-green-900 font-serif text-[11px] font-semibold tracking-tight text-ks-gold-100 shadow-[0_4px_10px_-4px_rgb(10_63_53/0.5)]"
                  >
                    A<span className="mx-[1px] italic text-ks-gold-500">&amp;</span>J
                  </div>

                  <span className="mt-2 font-serif text-[11px] italic text-ks-green-900/80">
                    {s.previewEyebrow}
                  </span>
                </div>

                {/* Middle section: Couple names + structured date & venue */}
                <div className="relative flex flex-col items-center px-4">
                  <p className="font-serif text-[27px] leading-[1.02] tracking-[-0.02em] text-ks-green-900">
                    Asha
                    <span className="mx-1.5 align-middle font-serif italic text-ks-gold-500">
                      &amp;
                    </span>
                    Juma
                  </p>

                  {/* Gold diamond divider */}
                  <span
                    aria-hidden="true"
                    className="my-2 inline-flex items-center gap-1.5 text-ks-gold-500/75"
                  >
                    <span className="h-px w-8 bg-current" />
                    <span className="size-1.5 rotate-45 bg-ks-gold-500" />
                    <span className="h-px w-8 bg-current" />
                  </span>

                  <p className="rounded-full bg-ks-gold-100/90 px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-ks-green-900 ring-1 ring-ks-gold-500/30">
                    {s.previewDate}
                  </p>

                  <p className="mt-2 font-serif text-[11.5px] italic leading-snug text-ks-muted">
                    {s.previewVenueLine1} {s.previewVenueLine2}
                  </p>
                </div>

                {/* Bottom section: Perforated ticket divider + QR gate pass dock */}
                <div className="relative mt-1 bg-white/85 px-3.5 pb-3 pt-2.5">
                  {/* Ticket notches on left & right + dashed gold rule */}
                  <span
                    aria-hidden="true"
                    className="absolute -left-2 -top-2 size-4 rounded-full bg-[#0c4a3e]"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -right-2 -top-2 size-4 rounded-full bg-[#0c4a3e]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-3 top-0 border-t border-dashed border-ks-gold-500/45"
                  />

                  <div className="flex items-center justify-between gap-2.5 rounded-xl bg-white p-2 shadow-[0_2px_10px_-4px_rgb(10_63_53/0.16),inset_0_0_0_1px_rgb(217_164_65/0.4)]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 25 25"
                      className="size-[46px] shrink-0 text-ks-ink"
                      shapeRendering="crispEdges"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M0 0h7v7H0V0zm1 1v5h5V1H1zm1 1h3v3H2V2z" />
                      <path fillRule="evenodd" d="M18 0h7v7h-7V0zm1 1v5h5V1h-5zm1 1h3v3h-3V2z" />
                      <path fillRule="evenodd" d="M0 18h7v7H0v-7zm1 1v5h5v-5H1zm1 1h3v3H2v-3z" />
                      <path d="M9 0h2v1H9V0zm4 0h1v2h-1V0zm2 1h2v1h-2V1zM8 2h2v2H8V2zm3 1h2v1h-2V3zm4 1h2v2h-2V4zM9 5h3v1H9V5zm4 1h2v1h-2V6zM0 8h1v2H0V8zm2 0h2v1H2V8zm3 0h3v2H5V8zm4 0h2v2H9V8zm4 0h1v3h-1V8zm3 0h2v1h-2V8zm3 0h3v1h-3V8zm4 0h2v2h-2V8zM1 10h2v2H1v-2zm3 1h2v2H4v-2zm4 0h3v1H8v-1zm4 1h2v2h-2v-2zm4-1h2v2h-2v-2zm4 0h2v1h-2v-1zm3 1h2v3h-2v-3zM0 13h2v2H0v-2zm3 1h1v2H3v-2zm3-1h2v3H6v-3zm4 0h2v2h-2v-2zm5 1h3v1h-3v-1zm4-1h2v2h-2v-2zM8 16h2v2H8v-2zm3 0h2v1h-2v-1zm3 0h2v2h-2v-2zm4 0h3v3h-3v-3zm4 1h2v2h-2v-2zM9 18h1v3H9v-3zm2 1h3v2h-3v-2zm4 1h2v2h-2v-2zm4 0h2v2h-2v-2zm3 1h2v3h-2v-3zM8 22h2v3H8v-3zm3 1h2v2h-2v-2zm3 0h3v2h-3v-2zm4 1h3v1h-3v-1z" />
                    </svg>
                    <div className="flex min-w-0 flex-1 flex-col items-start text-left leading-tight">
                      <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-ks-muted">
                        {s.previewCodeLabel}
                      </span>
                      <span className="font-mono text-[13px] font-bold tracking-[0.1em] text-ks-green-900">
                        KH-4826
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-ks-green-700 px-2 py-0.5 text-[8.5px] font-semibold text-white">
                        <CheckCircle2 className="size-2.5 text-ks-gold-100" aria-hidden="true" />
                        RSVP · VIP
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kanga chevron band + home indicator */}
              <div
                aria-hidden="true"
                className="relative flex h-8 w-full shrink-0 items-end justify-center pb-1.5"
                style={{
                  background:
                    'linear-gradient(135deg,#D9A441 25%,transparent 25%) 0 0/8px 8px,' +
                    'linear-gradient(225deg,#D9A441 25%,transparent 25%) 4px 0/8px 8px,#0a3f35',
                }}
              >
                <span className="h-[3.5px] w-24 rounded-full bg-white/65 shadow-[0_1px_2px_rgb(0_0_0/0.35)]" />
              </div>
            </div>
          </div>

          {/* Floating card 2 (lower-right): Michango progress — positioned clear of the couple names & date pill */}
          <div className="absolute -right-2 top-[68%] z-20 hidden w-[12.25rem] -translate-y-1/2 rounded-2xl bg-white/95 p-3.5 shadow-[0_22px_44px_-16px_rgb(232_149_48/0.38),inset_0_0_0_1px_rgb(232_149_48/0.24)] backdrop-blur-md md:block lg:-right-8">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-ks-ink/80">
                <Wallet className="size-3.5 text-ks-saffron" aria-hidden="true" />
                {s.michangoTitle}
              </span>
              <span className="tabular rounded-full bg-ks-saffron-100 px-1.5 py-0.5 text-[10px] font-bold text-ks-terracotta">
                70%
              </span>
            </div>
            <div className="tabular mt-2.5 flex items-baseline justify-between text-xs text-ks-muted">
              <span>{s.michangoPledged}</span>
              <span className="text-[13px] font-semibold text-ks-ink">
                {s.michangoPledgedAmount}
              </span>
            </div>
            <div className="tabular mt-1 flex items-baseline justify-between text-xs text-ks-muted">
              <span>{s.michangoReceived}</span>
              <span className="text-[13px] font-bold text-ks-green-700">
                {s.michangoReceivedAmount}
              </span>
            </div>
            <div
              className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ks-saffron-100"
              aria-hidden="true"
            >
              <div
                className="h-full w-[70%] rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #e89530 0%, #c81f6a 100%)',
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-ks-muted">{s.michangoPercent}</p>
          </div>

          {/* Floating card 3 (bottom-left): Offline gate check-in toast */}
          <div className="absolute bottom-5 left-0 z-20 hidden items-center gap-2.5 rounded-full bg-ks-green-900 py-2 pl-2 pr-4 text-white shadow-[0_22px_44px_-14px_rgb(10_63_53/0.55),inset_0_0_0_1px_rgb(255_255_255/0.12)] md:flex lg:-left-4">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-ks-saffron text-ks-ink shadow-[0_4px_10px_-2px_rgb(232_149_48/0.5)]">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-xs font-semibold text-white">{s.checkedInTitle}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-ks-green-100/90">
                <Wifi className="size-3 text-ks-gold-500" aria-hidden="true" />
                {s.checkedInOffline}
              </span>
            </span>
          </div>

          {/* Mobile-only stat grid */}
          <div className="grid w-full grid-cols-3 gap-2.5 md:hidden">
            <div className="rounded-2xl border border-ks-magenta/20 bg-white/95 p-3 text-center shadow-[0_10px_22px_-14px_rgb(200_31_106/0.3)]">
              <Users className="mx-auto size-4 text-ks-magenta" aria-hidden="true" />
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ks-muted">
                {s.guestsTitle}
              </p>
              <p className="tabular mt-1 text-sm font-bold text-ks-ink">214/320</p>
            </div>
            <div className="rounded-2xl border border-ks-saffron/30 bg-white/95 p-3 text-center shadow-[0_10px_22px_-14px_rgb(232_149_48/0.35)]">
              <Wallet className="mx-auto size-4 text-ks-saffron" aria-hidden="true" />
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ks-muted">
                {s.michangoTitle}
              </p>
              <p className="tabular mt-1 text-sm font-bold text-ks-ink">70%</p>
            </div>
            <div className="rounded-2xl border border-ks-green-700/20 bg-ks-green-900 p-3 text-center text-white shadow-[0_10px_22px_-14px_rgb(10_63_53/0.45)]">
              <CheckCircle2 className="mx-auto size-4 text-ks-saffron" aria-hidden="true" />
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ks-green-100/85">
                {s.checkedInTitle}
              </p>
              <p className="mt-1 inline-flex items-center justify-center gap-1 text-[11px] font-medium text-white">
                <Wifi className="size-3 text-ks-gold-500" aria-hidden="true" />
                {s.checkedInOffline}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
