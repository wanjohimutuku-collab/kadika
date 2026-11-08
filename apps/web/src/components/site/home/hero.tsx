import { CheckCircle2, Play, Users, Wallet, Wifi } from 'lucide-react';
import { SiteLink as Link } from '@/components/site/site-link';
import type { HeroStatCardsCopy } from '@/content/home';

/**
 * The home hero's marketing surface: headline with one gold-accent word, short subtitle, a single
 * dominant primary CTA with a quiet "how it works" text link beside it, and a tight trust line
 * under them. The visual on the right is a drawn phone body showing the default Asha & Juma demo
 * card, with three floating product stat cards orbiting it — guest-list funnel, Michango progress
 * and an offline check-in badge — selling the whole product in one glance.
 *
 * Interactive editing (names, date, theme, download, share) lives in the `DemoStudio` island
 * below, so the hero can stay a conversion surface rather than a settings page.
 */

export interface HeroProps {
  h1: string;
  accentWord: string;
  sub: string;
  primary: { href: string; label: string };
  howHref: string;
  howLabel: string;
  trustLine: string;
  previewFrameAlt: string;
  statCards: HeroStatCardsCopy;
}

function splitOnAccent(h1: string, accent: string): [string, string, string] {
  if (!accent) return [h1, '', ''];
  const i = h1.toLowerCase().indexOf(accent.toLowerCase());
  if (i < 0) return [h1, '', ''];
  return [h1.slice(0, i), h1.slice(i, i + accent.length), h1.slice(i + accent.length)];
}

export function Hero(props: HeroProps) {
  const [pre, accent, post] = splitOnAccent(props.h1, props.accentWord);
  const s = props.statCards;
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.05fr_1fr] md:gap-16 md:py-24">
      <div className="flex flex-col gap-7">
        <h1 className="font-serif text-4xl leading-[1.08] tracking-[-0.02em] md:text-5xl">
          {pre}
          {accent ? <span className="text-ks-green-700">{accent}</span> : null}
          {post}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-ks-muted">{props.sub}</p>

        <div className="flex flex-wrap items-center gap-5 pt-2">
          <Link
            href={props.primary.href}
            className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-ks-green-700 px-8 text-base font-semibold text-white shadow-[0_8px_20px_-10px_rgb(15_92_77/0.6)] transition hover:bg-ks-green-700/90"
          >
            {props.primary.label}
          </Link>
          <Link
            href={props.howHref}
            className="group inline-flex items-center gap-2 text-base font-semibold text-ks-ink underline-offset-4 hover:underline"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-full border border-ks-ink/15 text-ks-green-700 transition group-hover:border-ks-green-700/50">
              <Play className="size-4" strokeWidth={2} aria-hidden="true" />
            </span>
            {props.howLabel}
          </Link>
        </div>
        <p className="inline-flex items-center gap-2 text-sm text-ks-muted">
          <CheckCircle2 className="size-4 text-ks-green-700" aria-hidden="true" />
          {props.trustLine}
        </p>
      </div>

      <div className="relative flex min-h-[560px] items-center justify-center md:min-h-[600px] md:justify-end">
        {/* Soft blurred backdrop so the stat cards feel grounded. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-10 right-0 w-[82%] rounded-[3rem] bg-gradient-to-br from-ks-green-100/70 via-white to-ks-gold-100/60 blur-md"
        />
        {/* Floating stat: guest list funnel (top-left of phone). */}
        <div className="absolute left-0 top-6 z-10 w-[11rem] rounded-2xl border border-ks-border/50 bg-white/95 p-3 shadow-[0_20px_40px_-24px_rgb(10_63_53/0.3)] backdrop-blur sm:top-10 md:w-[12rem]">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ks-muted">
            <Users className="size-3.5 text-ks-green-700" aria-hidden="true" />
            {s.guestsTitle}
          </div>
          <ul className="mt-2 space-y-1 text-sm font-medium text-ks-ink">
            <li>{s.guestsInvited}</li>
            <li className="text-ks-green-700">{s.guestsConfirmed}</li>
            <li className="text-ks-muted">{s.guestsAwaiting}</li>
          </ul>
        </div>
        {/* Phone body — matches the DemoStudio frame visually. */}
        <div
          aria-label={props.previewFrameAlt}
          role="img"
          className="relative"
          style={{ width: 280, height: 560 }}
        >
          <svg
            viewBox="0 0 300 600"
            width={280}
            height={560}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 drop-shadow-[0_28px_48px_rgb(10_63_53/0.35)]"
          >
            <defs>
              <linearGradient id="hero-bezel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1A1E1C" />
                <stop offset="100%" stopColor="#0B0E0D" />
              </linearGradient>
            </defs>
            <rect x="0" y="118" width="4" height="36" rx="2" fill="#141716" />
            <rect x="0" y="180" width="4" height="60" rx="2" fill="#141716" />
            <rect x="0" y="252" width="4" height="60" rx="2" fill="#141716" />
            <rect x="296" y="168" width="4" height="96" rx="2" fill="#141716" />
            <rect x="4" y="4" width="292" height="592" rx="44" fill="url(#hero-bezel)" />
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
            <rect x="120" y="22" width="60" height="18" rx="9" fill="#050707" />
            <circle cx="166" cy="31" r="2.2" fill="#1C2322" />
          </svg>
          <div
            className="absolute overflow-hidden"
            style={{
              top: 14,
              bottom: 14,
              left: 14,
              right: 14,
              borderRadius: 34,
              background: 'linear-gradient(135deg,#0F5C4D 0%,#B8893B 100%)',
            }}
          >
            <div className="h-10" aria-hidden="true" />
            <div className="flex h-[calc(100%-2.5rem)] flex-col items-center justify-between px-6 pt-8 pb-7 text-center text-white">
              <span className="text-[11px] uppercase tracking-[0.3em] opacity-85">Harusi</span>
              <div className="flex flex-col gap-2">
                <p className="font-serif text-[30px] leading-tight">Asha &amp; Juma</p>
                <p className="text-sm opacity-90">14 Desemba 2026</p>
              </div>
              <span className="rounded-full border border-white/40 bg-white/10 px-3 py-1 text-[11px] tracking-[0.25em]">
                KH-4826
              </span>
            </div>
          </div>
        </div>
        {/* Floating stat: contributions (right of phone). */}
        <div className="absolute right-0 top-28 z-10 w-[12rem] rounded-2xl border border-ks-border/50 bg-white/95 p-3 shadow-[0_20px_40px_-24px_rgb(10_63_53/0.3)] backdrop-blur sm:top-36 md:w-[13rem]">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ks-muted">
            <Wallet className="size-3.5 text-ks-gold-600" aria-hidden="true" />
            {s.michangoTitle}
          </div>
          <div className="mt-2 flex items-baseline justify-between text-xs text-ks-muted">
            <span>{s.michangoPledged}</span>
            <span className="text-sm font-semibold text-ks-ink">TZS 12M</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between text-xs text-ks-muted">
            <span>{s.michangoReceived}</span>
            <span className="text-sm font-semibold text-ks-green-700">TZS 8.4M</span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-ks-border/60"
            aria-hidden="true"
          >
            <div className="h-full w-[70%] rounded-full bg-ks-gold-500" />
          </div>
          <p className="mt-1 text-[11px] text-ks-muted">{s.michangoPercent}</p>
        </div>
        {/* Floating stat: gate check-in (bottom-left of phone). */}
        <div className="absolute bottom-10 left-2 z-10 flex items-center gap-2 rounded-full border border-ks-border/50 bg-white/95 py-2 pl-2 pr-4 shadow-[0_20px_40px_-24px_rgb(10_63_53/0.3)] backdrop-blur">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-ks-green-700 text-white">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-xs font-semibold text-ks-ink">{s.checkedInTitle}</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-ks-green-700">
              <Wifi className="size-3" aria-hidden="true" />
              {s.checkedInOffline}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
