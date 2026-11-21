import { SiteLink as Link } from '@/components/site/site-link';
import { Check, CircleAlert, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { QR_QUIET_ZONE, qrMatrix, qrPath } from '@/lib/qr';
import type { Currency } from '@harusi/schemas/country';
import type { SiteLink } from './blocks';

/**
 * The brand's signature pieces (kit brand.md § Signature components). Pictures of the product built from
 * markup, so they stay sharp, translatable and far under the 120 KB image budget.
 */

/** Not a card token: a demo string, so scanning the picture opens nothing. */
const DEMO_QR = 'KADISASA-DEMO-KH-4826';

function DemoQr({ label }: { label: string }) {
  const m = qrMatrix(DEMO_QR);
  const n = m.size + QR_QUIET_ZONE * 2;
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      role="img"
      aria-label={label}
      className="size-24 shrink-0 bg-white"
      shapeRendering="crispEdges"
    >
      <rect width={n} height={n} fill="#fff" />
      <path d={qrPath(m)} fill="#000" />
    </svg>
  );
}

export interface CardMockupProps {
  names: string;
  date: string;
  venue: string;
  /** "Wanawaalika {guest}" line. */
  invites: string;
  code: string;
  qrLabel: string;
  numberLabel: string;
}

/** Phone screen showing a guest card with animated QR scan sweep. */
export function CardMockup({
  names,
  date,
  venue,
  invites,
  code,
  qrLabel,
  numberLabel,
}: CardMockupProps) {
  return (
    <figure
      aria-hidden="true"
      className="w-[15.5rem] shrink-0 rounded-[2rem] bg-[#0a2640] p-1.5 shadow-[0_24px_48px_-18px_rgb(10_38_64/0.45)] ring-1 ring-[#5469d4]/25"
    >
      <div className="overflow-hidden rounded-[1.6rem] bg-gradient-to-b from-white to-[#f6f9fc] text-[#0a2640]">
        <div className="h-2 bg-gradient-to-r from-[#4f46e5] via-[#5469d4] to-[#3b82f6]" />
        <div className="flex flex-col items-center gap-1 px-4 pt-4 pb-3 text-center">
          <span className="mb-1 rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#4f46e5]">
            Digital Pass
          </span>
          <p className="font-ks-names text-[26px] leading-tight text-[#0a2640] italic">{names}</p>
          <p className="text-xs font-semibold text-[#0a2640]">{date}</p>
          <p className="text-xs text-[#494d59]">{venue}</p>
          <p className="mt-1.5 text-xs font-medium text-[#0a2640]">{invites}</p>
        </div>
        <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl border border-[#e3e8ee] bg-white p-2.5 shadow-xs">
          <div className="relative shrink-0 overflow-hidden rounded-lg">
            <DemoQr label={qrLabel} />
            <span className="qw-qr-scan-line" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] font-medium text-[#494d59]">{numberLabel}</span>
            <span className="tabular text-base font-bold whitespace-nowrap text-[#0a2640]">
              {code}
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}

/** The same card as a plain SMS, for guests on a feature phone. */
export function SmsBubble({ from, text }: { from: string; text: string }) {
  return (
    <figure
      aria-hidden="true"
      className="w-[14rem] rounded-2xl border border-[#e3e8ee] bg-white p-3.5 shadow-[0_20px_40px_-18px_rgb(10_38_64/0.25)] sm:w-[15.5rem]"
    >
      <figcaption className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-wide text-[#0a2640]">
        <span className="flex items-center gap-1.5">
          <span className="qw-ripple-dot" />
          {from}
        </span>
        <span className="rounded-full bg-[#f6f9fc] px-2 py-0.5 text-[9.5px] font-semibold text-[#5469d4] ring-1 ring-[#e3e8ee]">
          SMS
        </span>
      </figcaption>
      <p className="rounded-xl rounded-tl-sm bg-[#eef2ff]/70 px-3 py-2.5 text-xs leading-relaxed font-medium text-[#0a2640]">
        {text}
      </p>
    </figure>
  );
}

/** "Smartphone or not, everyone gets in": animated dual-channel showcase without overlap clipping. */
export function CardAndSms({
  card,
  sms,
}: {
  card: CardMockupProps;
  sms: { from: string; text: string };
}) {
  return (
    <div className="group relative flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
      <div className="qw-float-card transition-transform duration-500 ks-ease md:-rotate-2 md:group-hover:rotate-0">
        <CardMockup {...card} />
      </div>
      <div className="qw-float-slow transition-transform duration-500 ks-ease sm:-ml-4 sm:translate-y-8 md:rotate-2 md:group-hover:translate-y-4 md:group-hover:rotate-0">
        <SmsBubble {...sms} />
      </div>
    </div>
  );
}

export type GateState = 'ok' | 'duplicate' | 'missing';

const GATE = {
  ok: { Icon: Check, cls: 'bg-[#0f7a47] text-white shadow-xs' },
  duplicate: { Icon: CircleAlert, cls: 'bg-[#b45309] text-white shadow-xs' },
  missing: { Icon: X, cls: 'bg-[#b42318] text-white shadow-xs' },
} as const;

/** Gate result chip: icon + word + colour, never colour alone. */
export function GateChip({ state, label }: { state: GateState; label: string }) {
  const { Icon, cls } = GATE[state];
  return (
    <span
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1 text-sm font-bold',
        cls,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

export interface MichangoRow {
  name: string;
  pledged: number;
  paid: number;
}

/** Pledged vs paid per guest, with a total. Amounts in the page's market currency only. */
export function MichangoBar({
  rows,
  currency,
  labels,
}: {
  rows: MichangoRow[];
  currency: Currency;
  labels: { title: string; pledged: string; paid: string; total: string };
}) {
  const pledged = rows.reduce((s, r) => s + r.pledged, 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  const totalPct = pledged ? Math.min(100, Math.round((paid / pledged) * 100)) : 0;
  return (
    <figure className="w-full rounded-2xl border border-[#e3e8ee] bg-[#f6f9fc] p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <figcaption className="text-sm font-bold text-[#0a2640]">{labels.title}</figcaption>
        <span className="rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-xs font-bold text-[#4f46e5]">
          {totalPct}%
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const pct = r.pledged ? Math.min(100, Math.round((r.paid / r.pledged) * 100)) : 0;
          return (
            <li key={r.name} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-[#0a2640]">{r.name}</span>
                <span className="tabular text-[#494d59]">
                  {formatMoney(r.paid, currency)} / {formatMoney(r.pledged, currency)}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-[#e3e8ee]"
                role="img"
                aria-label={`${r.name}: ${labels.paid} ${formatMoney(r.paid, currency)}, ${labels.pledged} ${formatMoney(r.pledged, currency)}`}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    pct >= 100 ? 'bg-[#0f7a47]' : 'bg-[#5469d4]',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <dl className="tabular mt-4 grid grid-cols-2 gap-3 border-t border-[#e3e8ee] pt-3.5 text-sm">
        <div>
          <dt className="text-xs font-medium text-[#494d59]">{labels.pledged}</dt>
          <dd className="mt-0.5 font-bold text-[#0a2640]">{formatMoney(pledged, currency)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[#494d59]">{labels.paid}</dt>
          <dd className="mt-0.5 font-bold text-[#0f7a47]">{formatMoney(paid, currency)}</dd>
        </div>
      </dl>
    </figure>
  );
}

/** Committee name on every card, no PIN requests, and the way to check a card. */
export function TrustStrip({
  title,
  items,
  cta,
}: {
  title: string;
  items: string[];
  cta?: SiteLink;
}) {
  return (
    <div className="qw-card flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-9">
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2.5 text-lg font-bold text-[#0a2640]">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#0f7a47]">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          {title}
        </p>
        <ul className="flex flex-col gap-1.5 text-sm text-[#494d59] md:text-base">
          {items.map((i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="mt-1 size-4 shrink-0 text-[#5469d4]" aria-hidden="true" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </div>
      {cta ? (
        <Link
          href={cta.href}
          className="qw-btn-primary shrink-0 text-sm"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}

export interface AppMockupLabels {
  event: string;
  date: string;
  kpis: { label: string; value: string }[];
  funnel: string;
  michango: string;
  michangoValue: string;
  tabs: string[];
  gateTitle: string;
  gateName: string;
  gateParty: string;
  offline: string;
}

/**
 * The organizer and gate app as two phones: the Muhtasari dashboard, and a gate result in airplane mode.
 * Markup, not screenshots, so it stays sharp and light; decorative for screen readers (the copy says it).
 */
export function AppMockup({ labels }: { labels: AppMockupLabels }) {
  const recentGuests = [
    { initials: 'MS', name: labels.gateName, meta: labels.gateParty, ok: true },
    { initials: 'AK', name: 'Amina Khamis', meta: 'VIP · 2', ok: true },
    { initials: 'JM', name: 'Joseph Mwamba', meta: 'Table 4 · 1', ok: false },
  ];

  return (
    <div aria-hidden="true" className="relative flex items-end justify-center gap-4 sm:gap-6">
      {/* Left phone: Organizer Muhtasari dashboard */}
      <div className="w-[14.5rem] shrink-0 rounded-[2.25rem] bg-[#061526] p-1.5 shadow-[0_30px_60px_-24px_rgb(0_0_0/0.65)] ring-1 ring-white/15 sm:w-[16.5rem] md:-rotate-2">
        <div className="flex h-[27rem] flex-col overflow-hidden rounded-[1.9rem] bg-[#f6f9fc] text-[#0a2640] sm:h-[29.5rem]">
          {/* Dynamic island / status bar */}
          <div className="flex items-center justify-between px-4 pt-2.5 pb-1 text-[9px] font-semibold text-[#494d59]">
            <span>9:41</span>
            <span className="h-3.5 w-14 rounded-full bg-[#061526]" />
            <span>5G</span>
          </div>

          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <span className="text-sm font-bold text-[#0a2640]">{labels.event}</span>
            <span className="rounded-full bg-[#5469d4]/10 px-2 py-0.5 text-[10px] font-bold text-[#5469d4]">
              SW | EN
            </span>
          </div>
          <p className="px-4 text-[11px] text-[#494d59]">{labels.date}</p>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-1.5 px-3 pt-3">
            {labels.kpis.map((k, idx) => (
              <div key={k.label} className="rounded-xl bg-white p-2 ring-1 ring-[#e3e8ee]">
                <p
                  className={cn(
                    'tabular text-lg leading-none font-bold',
                    idx === 1 ? 'text-[#5469d4]' : 'text-[#0a2640]',
                  )}
                >
                  {k.value}
                </p>
                <p className="mt-1 text-[9px] leading-tight text-[#494d59]">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Funnel */}
          <div className="mx-3 mt-2.5 rounded-xl bg-white p-2.5 ring-1 ring-[#e3e8ee]">
            <p className="text-[10px] font-semibold text-[#494d59]">{labels.funnel}</p>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-[#eff2f7]">
              <span className="w-[46%] bg-[#5469d4]" />
              <span className="w-[24%] bg-[#3b82f6]" />
              <span className="w-[14%] bg-[#90e0ff]" />
            </div>
          </div>

          {/* Contributions */}
          <div className="mx-3 mt-2 rounded-xl bg-white p-2.5 ring-1 ring-[#e3e8ee]">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-semibold text-[#494d59]">{labels.michango}</p>
              <p className="tabular text-[11px] font-bold text-[#0a2640]">{labels.michangoValue}</p>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eff2f7]">
              <span className="block h-full w-[70%] rounded-full bg-gradient-to-r from-[#0f7a47] to-[#4ade80]" />
            </div>
          </div>

          {/* Live Guest Activity Feed (fills the middle cleanly) */}
          <div className="mx-3 mt-2 flex flex-1 flex-col gap-1.5 overflow-hidden rounded-xl bg-white p-2.5 ring-1 ring-[#e3e8ee]">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#494d59]">
                Live Activity
              </span>
              <span className="qw-ripple-dot" />
            </div>
            <div className="flex flex-col divide-y divide-[#eff2f7]">
              {recentGuests.map((g) => (
                <div key={g.initials} className="flex items-center justify-between py-1.5 first:pt-0.5 last:pb-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#5469d4]/10 text-[8.5px] font-bold text-[#5469d4]">
                      {g.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold text-[#0a2640]">{g.name}</p>
                      <p className="truncate text-[8.5px] text-[#494d59]">{g.meta}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                      g.ok ? 'bg-[#dcfce7] text-[#0f7a47]' : 'bg-[#eff2f7] text-[#494d59]',
                    )}
                  >
                    {g.ok ? 'In' : 'RSVP'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom nav */}
          <div className="mt-2 grid grid-cols-5 border-t border-[#e3e8ee] bg-white px-1 py-2">
            {labels.tabs.map((t, i) => (
              <span
                key={t}
                className={cn(
                  'truncate text-center text-[9px] font-semibold',
                  i === 0 ? 'text-[#5469d4]' : 'text-[#494d59]',
                )}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right phone: Offline QR Gate scanner */}
      <div className="-ml-14 mb-6 w-[11rem] shrink-0 rounded-[2rem] bg-[#061526] p-1.5 shadow-[0_30px_60px_-24px_rgb(0_0_0/0.65)] ring-1 ring-white/15 sm:-ml-10 sm:w-[12.5rem] md:rotate-3">
        <div className="flex h-[20.5rem] flex-col overflow-hidden rounded-[1.65rem] bg-gradient-to-b from-[#075E20] to-[#043f15] text-white sm:h-[22.5rem]">
          <div className="flex items-center justify-between px-3 pt-3 text-[10px] font-semibold text-white/90">
            <span className="flex items-center gap-1.5">
              <span className="qw-ripple-dot" />
              {labels.offline}
            </span>
            <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[8.5px] font-bold">
              QR
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-3 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/15 ring-4 ring-[#7dff7a]/35">
              <Check className="size-8 text-[#7dff7a]" strokeWidth={2.75} />
            </span>
            <p className="text-[12px] font-bold tracking-wider text-[#7dff7a] uppercase">
              {labels.gateTitle}
            </p>
            <p className="text-lg leading-tight font-bold text-white">{labels.gateName}</p>
            <p className="text-[11px] text-white/85">{labels.gateParty}</p>
            <span className="mt-1 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold text-white/95">
              0.3s · Offline Verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
