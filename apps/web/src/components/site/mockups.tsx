import Link from 'next/link';
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
      className="w-[12.5rem] rounded-2xl sm:w-[15rem] border border-ks-line bg-white p-3 shadow-sm"
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
      <CardMockup {...card} />
      <div className="-mt-8 self-end sm:mt-0 sm:-ml-14 sm:translate-y-6 sm:self-auto">
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
    <figure className="w-full max-w-md rounded-ks border border-ks-line bg-white p-4">
      <figcaption className="mb-3 font-semibold">{labels.title}</figcaption>
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
    <div className="flex flex-col gap-4 rounded-ks border border-ks-line bg-white p-5 md:flex-row md:items-center md:justify-between md:p-6">
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
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-ks border-2 border-ks-green-700 px-5 font-semibold text-ks-green-700 hover:bg-ks-green-100"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}
