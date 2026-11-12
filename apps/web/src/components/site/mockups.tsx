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

/** Phone screen showing a guest card. Names use the optional display font (Fraunces italic, 28 px+). */
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
      className="w-[15rem] shrink-0 rounded-[2rem] border-[6px] border-ks-ink bg-ks-ink p-1 shadow-[0_12px_30px_-12px_rgba(10,63,53,0.45)]"
    >
      <div className="overflow-hidden rounded-[1.5rem] bg-ks-gold-100">
        <div className="ks-kanga h-3" />
        <div className="flex flex-col items-center gap-1 px-4 pt-4 pb-3 text-center">
          <p className="font-ks-names text-[28px] leading-tight text-ks-green-900 italic">
            {names}
          </p>
          <p className="text-sm font-semibold">{date}</p>
          <p className="text-sm text-ks-muted">{venue}</p>
          <p className="mt-2 text-sm">{invites}</p>
        </div>
        <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl bg-white p-2">
          <DemoQr label={qrLabel} />
          <div className="flex flex-col">
            <span className="text-xs text-ks-muted">{numberLabel}</span>
            <span className="tabular text-lg font-bold whitespace-nowrap">{code}</span>
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
      className="w-[12.5rem] rounded-[1.25rem] bg-white p-3 shadow-[0_20px_40px_-20px_rgb(10_63_53/0.35),0_0_0_1px_rgb(26_31_29/0.06)] sm:w-[15rem]"
    >
      <figcaption className="mb-1 text-xs font-semibold text-ks-muted">{from}</figcaption>
      <p className="rounded-xl rounded-tl-sm bg-ks-green-100 px-3 py-2 text-sm leading-snug">
        {text}
      </p>
    </figure>
  );
}

/** "Smartphone or not, everyone gets in": the brand's main image. */
export function CardAndSms({
  card,
  sms,
}: {
  card: CardMockupProps;
  sms: { from: string; text: string };
}) {
  return (
    <div className="relative flex w-full max-w-[22rem] flex-col items-start sm:max-w-none sm:flex-row sm:items-end sm:pb-6">
      <div className="md:-rotate-3">
        <CardMockup {...card} />
      </div>
      <div className="-mt-8 self-end sm:mt-0 sm:-ml-14 sm:translate-y-6 sm:self-auto md:rotate-[4deg]">
        <SmsBubble {...sms} />
      </div>
    </div>
  );
}

export type GateState = 'ok' | 'duplicate' | 'missing';

const GATE = {
  ok: { Icon: Check, cls: 'bg-ks-ok text-white ring-4 ring-ks-gold-500/40' },
  duplicate: { Icon: CircleAlert, cls: 'bg-ks-warn text-white' },
  missing: { Icon: X, cls: 'bg-ks-error text-white' },
} as const;

/** Gate result chip: icon + word + colour, never colour alone. */
export function GateChip({ state, label }: { state: GateState; label: string }) {
  const { Icon, cls } = GATE[state];
  return (
    <span
      className={cn(
        // 20 px bold is large text, so the brand's ok and warn fills meet contrast (3:1) with white.
        'inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-xl font-bold',
        cls,
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
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
  return (
    <figure className="ks-bezel w-full max-w-md">
      <div className="ks-core p-5">
        <figcaption className="mb-4 font-semibold">{labels.title}</figcaption>
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const pct = r.pledged ? Math.min(100, Math.round((r.paid / r.pledged) * 100)) : 0;
            return (
              <li key={r.name} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{r.name}</span>
                  <span className="tabular text-ks-muted">
                    {formatMoney(r.paid, currency)} / {formatMoney(r.pledged, currency)}
                  </span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-ks-line"
                  role="img"
                  aria-label={`${r.name}: ${labels.paid} ${formatMoney(r.paid, currency)}, ${labels.pledged} ${formatMoney(r.pledged, currency)}`}
                >
                  <div
                    className={cn('h-full rounded-full', pct >= 100 ? 'bg-ks-ok' : 'bg-ks-warn')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <dl className="tabular mt-4 grid grid-cols-2 gap-2 border-t border-ks-line pt-3 text-sm">
          <div>
            <dt className="text-ks-muted">{labels.pledged}</dt>
            <dd className="font-bold">{formatMoney(pledged, currency)}</dd>
          </div>
          <div>
            <dt className="text-ks-muted">{labels.paid}</dt>
            <dd className="font-bold text-ks-green-700">{formatMoney(paid, currency)}</dd>
          </div>
        </dl>
      </div>
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
    <div className="ks-bezel">
      <div className="ks-core flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-10">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-6 text-ks-ok" aria-hidden="true" />
            {title}
          </p>
          <ul className="flex flex-col gap-1.5 text-ks-ink">
            {items.map((i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-ks-ok" aria-hidden="true" />
                {i}
              </li>
            ))}
          </ul>
        </div>
        {cta ? (
          <Link
            href={cta.href}
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full px-6 font-semibold text-ks-green-900 shadow-[inset_0_0_0_1px_rgb(15_92_77/0.3)] transition-[box-shadow,transform] duration-500 ks-ease hover:shadow-[inset_0_0_0_1.5px_rgb(15_92_77/0.7)] active:scale-[0.98]"
          >
            {cta.label}
          </Link>
        ) : null}
      </div>
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
  return (
    <div aria-hidden="true" className="relative flex items-end justify-center gap-4 sm:gap-6">
      <div className="w-[13.5rem] shrink-0 rounded-[2.25rem] bg-ks-ink p-1.5 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] sm:w-[15.5rem] md:-rotate-2">
        <div className="flex h-[25rem] flex-col overflow-hidden rounded-[1.9rem] bg-ks-paper text-ks-ink sm:h-[28rem]">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-sm font-bold text-ks-green-900">{labels.event}</span>
            <span className="rounded-full bg-ks-green-100 px-2 py-0.5 text-[10px] font-semibold text-ks-green-700">
              SW | EN
            </span>
          </div>
          <p className="px-4 text-[11px] text-ks-muted">{labels.date}</p>
          <div className="grid grid-cols-3 gap-1.5 px-3 pt-3">
            {labels.kpis.map((k) => (
              <div key={k.label} className="rounded-xl bg-white p-2 ring-1 ring-ks-line">
                <p className="tabular text-lg leading-none font-bold">{k.value}</p>
                <p className="mt-1 text-[9px] leading-tight text-ks-muted">{k.label}</p>
              </div>
            ))}
          </div>
          <div className="mx-3 mt-3 rounded-xl bg-white p-3 ring-1 ring-ks-line">
            <p className="text-[10px] font-semibold text-ks-muted">{labels.funnel}</p>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-ks-line">
              <span className="w-[44%] bg-ks-green-700" />
              <span className="w-[22%] bg-ks-green-700/60" />
              <span className="w-[14%] bg-ks-gold-500" />
            </div>
          </div>
          <div className="mx-3 mt-2 rounded-xl bg-white p-3 ring-1 ring-ks-line">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-semibold text-ks-muted">{labels.michango}</p>
              <p className="tabular text-[11px] font-bold">{labels.michangoValue}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ks-line">
              <span className="block h-full w-[70%] rounded-full bg-ks-ok" />
            </div>
          </div>
          <div className="mt-auto grid grid-cols-5 border-t border-ks-line bg-white px-1 py-2">
            {labels.tabs.map((t, i) => (
              <span
                key={t}
                className={cn(
                  'truncate text-center text-[9px] font-semibold',
                  i === 0 ? 'text-ks-green-700' : 'text-ks-muted',
                )}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="-ml-16 mb-6 w-[10.5rem] shrink-0 rounded-[2rem] bg-ks-ink p-1.5 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] sm:-ml-10 sm:w-[12rem] md:rotate-3">
        <div className="flex h-[19rem] flex-col overflow-hidden rounded-[1.65rem] bg-[#075E20] text-white sm:h-[21rem]">
          <p className="flex items-center gap-1.5 px-3 pt-3 text-[10px] font-semibold text-white/85">
            <span className="size-1.5 rounded-full bg-ks-gold-500" />
            {labels.offline}
          </p>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-white/15 ring-4 ring-ks-gold-500/40">
              <Check className="size-8" strokeWidth={2.5} />
            </span>
            <p className="text-[13px] font-bold tracking-wide uppercase">{labels.gateTitle}</p>
            <p className="text-lg leading-tight font-bold">{labels.gateName}</p>
            <p className="text-[11px] text-white/85">{labels.gateParty}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
