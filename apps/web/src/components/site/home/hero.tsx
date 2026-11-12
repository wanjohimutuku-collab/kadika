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
  kickerEvents: readonly [string, string, string, string, string, string];
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
    <section className="ks-mesh relative overflow-hidden">
      {/* Soft kitenge chevron strip along the top edge — a thread from the wedding's own
          fabric vocabulary, repeated at the CtaBand so the page bookends in colour. */}
      <div
        aria-hidden="true"
        className="ks-kitenge pointer-events-none absolute inset-x-0 top-0 h-1.5 opacity-70"
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 pt-16 pb-20 md:grid-cols-[1.05fr_1fr] md:gap-16 md:pt-24 md:pb-28">
        <div className="flex flex-col gap-7">
          {/* Kicker row — one card, every celebration. Each event label picks up the same
              kanga key used by its celebration pill further down the page, so the colour
              story is coherent and the service's reach is unmissable. */}
          <ul className="-mx-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
            {(
              [
                [props.kickerEvents[0], 'text-ks-magenta'],
                [props.kickerEvents[1], 'text-ks-saffron'],
                [props.kickerEvents[2], 'text-ks-green-700'],
                [props.kickerEvents[3], 'text-ks-indigo'],
                [props.kickerEvents[4], 'text-ks-terracotta'],
                [props.kickerEvents[5], 'text-ks-magenta'],
              ] as const
            ).map(([label, color], i) => (
              <li key={label} className="inline-flex items-center gap-3">
                {i > 0 ? (
                  <span aria-hidden="true" className="text-ks-ink/30">
                    ·
                  </span>
                ) : null}
                <span className={`inline-flex items-center gap-1.5 ${color}`}>
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-current opacity-80"
                  />
                  {label}
                </span>
              </li>
            ))}
          </ul>
          <h1 className="font-serif text-[44px] leading-[1.02] tracking-[-0.035em] text-ks-ink md:text-[64px] xl:text-[72px]">
            {pre}
            {accent ? (
              <span className="relative inline-block text-ks-magenta">
                {accent}
                {/* Hand-drawn gold underline — one deliberate flourish instead of a color
                    swap. Vibrance is a brushstroke, not a highlight marker. */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 200 14"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute -bottom-1 left-0 h-[0.35em] w-full text-ks-saffron"
                >
                  <path
                    d="M3 8 Q 50 2 100 7 Q 150 11 197 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            ) : null}
            {post}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-ks-ink/75 md:text-xl">{props.sub}</p>

          <div className="flex flex-wrap items-center gap-5 pt-2">
            <Link
              href={props.primary.href}
              className="group relative inline-flex min-h-[3.5rem] items-center justify-center overflow-hidden rounded-full bg-ks-green-900 px-9 text-base font-semibold text-white shadow-[0_18px_40px_-14px_rgb(10_63_53/0.55)] transition hover:bg-ks-ink"
            >
              {/* Saffron blush that races through on hover — one small moment of life. */}
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-ks-saffron/0 via-ks-saffron/40 to-ks-saffron/0 transition-transform duration-700 group-hover:translate-x-full"
              />
              <span className="relative">{props.primary.label}</span>
            </Link>
            <Link
              href={props.howHref}
              className="group inline-flex items-center gap-2 text-base font-semibold text-ks-ink underline-offset-4 hover:underline"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-ks-saffron text-ks-ink shadow-[0_6px_16px_-6px_rgb(232_149_48/0.7)] transition group-hover:scale-[1.04]">
                <Play className="size-4 fill-ks-ink" strokeWidth={0} aria-hidden="true" />
              </span>
              {props.howLabel}
            </Link>
          </div>
          <p className="inline-flex items-center gap-2 text-sm text-ks-ink/70">
            <CheckCircle2 className="size-4 text-ks-green-700" aria-hidden="true" />
            {props.trustLine}
          </p>
        </div>

        <div className="relative flex flex-col items-center gap-6 md:min-h-[600px] md:items-stretch md:justify-end">
          {/* Backdrop glow — a warm cream halo behind the phone, picking up the mesh's
              saffron so the kadi reads as something the page is holding up. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-6 right-0 hidden w-[90%] rounded-[3rem] bg-gradient-to-br from-ks-saffron-100 via-white to-ks-magenta-100/70 md:block"
          />
          {/* Floating stat: guest list funnel, in a kanga-magenta key so the colour story
              carries across all three orbiting cards. */}
          <div className="absolute -left-6 -top-2 z-10 hidden w-[12rem] rounded-2xl bg-white p-3 shadow-[0_20px_40px_-18px_rgb(200_31_106/0.35),inset_0_0_0_1px_rgb(200_31_106/0.14)] md:block">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ks-magenta">
              <Users className="size-3.5" aria-hidden="true" />
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
                {/* Gold corner ornaments — a classic certificate/invitation frame: double-line
                  L-bracket in gold with a small four-point star at the meeting corner. One SVG
                  mirrored to all four corners. Reads instantly as formal invitation corner,
                  not as a decorative eye. */}
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
                    className={`pointer-events-none absolute ${pos} ${flip} size-11 text-ks-gold-500`}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                  >
                    {/* Outer L-bracket with gently rounded inside corner */}
                    <path d="M4 36 L4 10 Q 4 4 10 4 L36 4" strokeWidth="1.4" />
                    {/* Inner parallel L, shorter and softer */}
                    <path d="M9 32 L9 14 Q 9 9 14 9 L32 9" strokeWidth="0.9" opacity=".6" />
                    {/* Four-point star at the frame's meeting corner */}
                    <g transform="translate(14 14)" stroke="none" fill="currentColor">
                      <path d="M0 -3.4 L0.7 -0.7 L3.4 0 L0.7 0.7 L0 3.4 L-0.7 0.7 L-3.4 0 L-0.7 -0.7 Z" />
                    </g>
                  </svg>
                ))}

                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-serif text-[12px] italic text-ks-green-900/80">
                    ~ Sherehe ya ~
                  </span>
                  {/* Small gold diamond ornament — a quiet pivot between eyebrow and names. */}
                  <span className="inline-flex items-center gap-1.5 text-ks-gold-500/70">
                    <span aria-hidden="true" className="h-px w-6 bg-current" />
                    <span aria-hidden="true" className="size-1.5 rotate-45 bg-ks-gold-500" />
                    <span aria-hidden="true" className="h-px w-6 bg-current" />
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="font-serif text-[28px] leading-[1.02] text-ks-green-900">
                    Asha
                    <span className="mx-1.5 align-middle font-serif text-ks-gold-500 italic">
                      &amp;
                    </span>
                    Juma
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-ks-muted">
                    14 · Desemba · 2026
                  </p>
                  {/* Venue line in italic Fraunces — one quiet detail that makes the kadi feel
                    wedding-shaped instead of generic. */}
                  <p className="mt-1 font-serif text-[12px] italic leading-tight text-ks-muted">
                    Ukumbi wa Mwanga,
                    <br />
                    Kibaha
                  </p>
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
          {/* Floating stat: contributions, saffron key. The progress bar now runs saffron
              → magenta so the michango number carries real colour. */}
          <div className="absolute -right-4 top-28 z-10 hidden w-[13rem] rounded-2xl bg-white p-3 shadow-[0_20px_40px_-18px_rgb(232_149_48/0.4),inset_0_0_0_1px_rgb(232_149_48/0.2)] md:block md:top-40">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ks-ink/80">
              <Wallet className="size-3.5 text-ks-saffron" aria-hidden="true" />
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
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-ks-saffron-100"
              aria-hidden="true"
            >
              <div
                className="h-full w-[70%] rounded-full"
                style={{
                  background: 'linear-gradient(90deg,#e89530 0%,#c81f6a 100%)',
                }}
              />
            </div>
            <p className="mt-1 text-[11px] text-ks-muted">{s.michangoPercent}</p>
          </div>
          {/* Floating stat: gate check-in (hangs below the phone, desktop only). Jewel emerald
              key completes the three-color story. */}
          <div className="absolute -bottom-5 -left-4 z-10 hidden items-center gap-2 rounded-full bg-white py-2 pl-2 pr-4 shadow-[0_20px_40px_-18px_rgb(15_92_77/0.4),inset_0_0_0_1px_rgb(15_92_77/0.14)] md:flex">
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
      </div>
    </section>
  );
}
