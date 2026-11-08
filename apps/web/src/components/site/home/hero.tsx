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

      <div className="relative flex flex-col items-center gap-6 md:min-h-[600px] md:items-stretch md:justify-end">
        {/* Soft blurred backdrop so the stat cards feel grounded (desktop only). */}
        <div
          aria-hidden="true"
          className="absolute inset-y-10 right-0 hidden w-[82%] rounded-[3rem] bg-gradient-to-br from-ks-green-100/70 via-white to-ks-gold-100/60 blur-md md:block"
        />
        {/* Floating stat: guest list funnel. Sits outside the phone's top-left so it never
            crops the kadi's eyebrow swash or gold corner. */}
        <div className="absolute -left-6 -top-2 z-10 hidden w-[12rem] rounded-2xl border border-ks-border/50 bg-white p-3 shadow-[0_20px_40px_-24px_rgb(10_63_53/0.3)] md:block">
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
          {/* The signature moment: the phone holds a real wedding-card interior — not a gradient
              tile. Hand-drawn gold scroll corners, italic swash eyebrow, Fraunces display names,
              an abstracted QR plate with short code, and a kanga chevron band. The ornament
              motif reappears, hairline, under the AnswerBlock. */}
          <div
            className="absolute overflow-hidden"
            style={{
              top: 14,
              bottom: 14,
              left: 14,
              right: 14,
              borderRadius: 34,
              background:
                'radial-gradient(120% 80% at 15% 0%, #1b7764 0%, #0F5C4D 55%, #0a3f35 100%)',
            }}
          >
            <div className="h-10" aria-hidden="true" />
            {/* Ornamental inner card on warm ivory, inset so the gold edges can breathe. */}
            <div className="relative mx-5 mb-6 mt-5 flex h-[calc(100%-2.5rem-2.75rem)] flex-col items-center justify-between overflow-hidden rounded-[22px] bg-[#FBF8F1] px-5 pb-5 pt-7 text-center text-ks-ink">
              {/* Gold scroll corners — one copperplate-filigree SVG, mirrored to the four
                  corners via transforms. Stronger stroke so they read as ornament, not scribble. */}
              {([
                ['left-1.5 top-1.5', ''],
                ['right-1.5 top-1.5', '-scale-x-100'],
                ['left-1.5 bottom-1.5', '-scale-y-100'],
                ['right-1.5 bottom-1.5', '-scale-100'],
              ] as const).map(([pos, flip], i) => (
                <svg
                  key={i}
                  aria-hidden="true"
                  viewBox="0 0 40 40"
                  className={`pointer-events-none absolute ${pos} ${flip} size-10 text-ks-gold-500`}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                >
                  {/* Outer scroll */}
                  <path d="M3 20 Q 3 3 20 3" strokeWidth="1.6" />
                  {/* Inner curl into a round terminal */}
                  <path
                    d="M3 20 Q 3 10 10 10 Q 15 10 15 15 Q 15 18 12 18"
                    strokeWidth="1.1"
                    opacity=".8"
                  />
                  {/* Leafy flourish along the diagonal */}
                  <path d="M20 3 Q 24 7 22 12" strokeWidth="0.9" opacity=".6" />
                  <path d="M3 20 Q 7 24 12 22" strokeWidth="0.9" opacity=".6" />
                  {/* Small accent dot */}
                  <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
                </svg>
              ))}

              <div className="flex flex-col items-center gap-1">
                <span className="font-serif text-[12px] italic text-ks-green-900/80">
                  ~ Harusi ya ~
                </span>
                <span className="h-px w-10 bg-ks-gold-500/60" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-serif text-[27px] leading-[1.02] text-ks-green-900">
                  Asha
                  <span className="mx-1.5 align-middle font-serif text-ks-gold-500 italic">
                    &amp;
                  </span>
                  Juma
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-ks-muted">
                  14 · Desemba · 2026
                </p>
                {/* Venue + dress code — fills the quiet middle of the kadi the way a real
                    printed invitation would, and reinforces that this is wedding-shaped. */}
                <div className="mt-2 flex flex-col items-center gap-1.5 text-ks-muted">
                  <span className="font-serif text-[12px] italic">Ukumbi wa Mwanga, Kibaha</span>
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.2em]">
                    <span
                      aria-hidden="true"
                      className="inline-block size-1.5 rounded-full bg-ks-green-700"
                    />
                    Kijani
                    <span className="opacity-40">·</span>
                    <span
                      aria-hidden="true"
                      className="inline-block size-1.5 rounded-full bg-ks-gold-500"
                    />
                    Dhahabu
                  </span>
                </div>
              </div>

              {/* Abstracted QR plate + short code, side by side in a thin gold-bordered band —
                  the band is what a committee prints beside the QR on the paper kadi. */}
              <div className="flex items-center gap-3 rounded-lg bg-white px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgb(217_164_65/0.4)]">
                <div
                  aria-hidden="true"
                  className="grid size-[54px] shrink-0 grid-cols-7 grid-rows-7 gap-[2px]"
                >
                  <span className="col-span-2 row-span-2 rounded-[1.5px] bg-ks-ink" />
                  <span />
                  <span className="bg-ks-ink/85" />
                  <span />
                  <span className="bg-ks-ink/85" />
                  <span className="col-span-2 row-span-2 rounded-[1.5px] bg-ks-ink" />
                  <span className="bg-ks-ink/85" />
                  <span />
                  <span className="bg-ks-ink/60" />
                  <span className="bg-ks-ink/85" />
                  <span />
                  <span className="bg-ks-ink/85" />
                  <span />
                  <span className="bg-ks-ink/85" />
                  <span className="bg-ks-ink/60" />
                  <span />
                  <span className="bg-ks-ink/85" />
                  <span className="col-span-2 row-span-2 rounded-[1.5px] bg-ks-ink" />
                  <span />
                  <span className="bg-ks-ink/85" />
                  <span />
                  <span className="bg-ks-ink/85" />
                  <span className="bg-ks-ink/60" />
                  <span />
                </div>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-ks-muted">
                    Namba
                  </span>
                  <span className="font-mono text-[14px] font-semibold tracking-[0.12em] text-ks-green-900">
                    KH-4826
                  </span>
                </span>
              </div>
            </div>
            {/* Kanga chevron band at the bottom of the phone screen. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-7"
              style={{
                background:
                  'linear-gradient(135deg,#D9A441 25%,transparent 25%) 0 0/8px 8px,' +
                  'linear-gradient(225deg,#D9A441 25%,transparent 25%) 4px 0/8px 8px,#0a3f35',
              }}
            />
          </div>
        </div>
        {/* Floating stat: contributions. Pushed slightly outside the phone so the top-right
            gold corner stays visible. */}
        <div className="absolute -right-4 top-28 z-10 hidden w-[13rem] rounded-2xl border border-ks-border/50 bg-white p-3 shadow-[0_20px_40px_-24px_rgb(10_63_53/0.3)] md:block md:top-40">
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
        {/* Floating stat: gate check-in (hangs below the phone, desktop only, so nothing covers
            the card's QR, short code or bottom-left scroll corner — the signature. */}
        <div className="absolute -bottom-5 -left-4 z-10 hidden items-center gap-2 rounded-full border border-ks-border/50 bg-white py-2 pl-2 pr-4 shadow-[0_20px_40px_-24px_rgb(10_63_53/0.3)] md:flex">
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

        {/* Mobile-only stat row: a tidy 3-up grid under the phone that carries the same product
            story as the floating cards on desktop. */}
        <div className="grid w-full grid-cols-3 gap-2 md:hidden">
          <div className="rounded-2xl border border-ks-border/60 bg-white p-3 text-center shadow-[0_8px_18px_-14px_rgb(10_63_53/0.25)]">
            <Users className="mx-auto size-4 text-ks-green-700" aria-hidden="true" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ks-muted">
              {s.guestsTitle}
            </p>
            <p className="mt-1 text-sm font-semibold text-ks-ink">214/320</p>
          </div>
          <div className="rounded-2xl border border-ks-border/60 bg-white p-3 text-center shadow-[0_8px_18px_-14px_rgb(10_63_53/0.25)]">
            <Wallet className="mx-auto size-4 text-ks-gold-500" aria-hidden="true" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ks-muted">
              {s.michangoTitle}
            </p>
            <p className="mt-1 text-sm font-semibold text-ks-ink">70%</p>
          </div>
          <div className="rounded-2xl border border-ks-border/60 bg-white p-3 text-center shadow-[0_8px_18px_-14px_rgb(10_63_53/0.25)]">
            <CheckCircle2 className="mx-auto size-4 text-ks-green-700" aria-hidden="true" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ks-muted">
              {s.checkedInTitle}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-ks-green-700">
              <Wifi className="size-3" aria-hidden="true" />
              {s.checkedInOffline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
