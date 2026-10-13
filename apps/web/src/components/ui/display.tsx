import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, WifiOff, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

export type Tone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';

const toneSoft: Record<Tone, string> = {
  neutral: 'bg-ink/6 text-ink',
  primary: 'bg-primary/10 text-ink',
  info: 'bg-info/10 text-ink',
  success: 'bg-success/12 text-ink',
  warning: 'bg-warning/15 text-ink',
  danger: 'bg-danger/10 text-ink',
};

const toneDot: Record<Tone, string> = {
  neutral: 'bg-muted',
  primary: 'bg-primary',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

const toneText: Record<Tone, string> = {
  neutral: 'text-muted',
  primary: 'text-primary',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

/** Status pill: colour + icon/dot + word — colour is never the only signal (§17.12). */
export function StatusPill({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium',
        toneSoft[tone],
        className,
      )}
    >
      {icon ?? <span className={cn('size-2 rounded-full', toneDot[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}

const AVATAR_COLORS = [
  '#0F5C4D',
  '#1F3A5F',
  '#9A3B1F',
  '#8C3B57',
  '#5E4B8B',
  '#2F6B3A',
  '#7A4A00',
  '#235B70',
];

export function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: AVATAR_COLORS[h % AVATAR_COLORS.length],
      }}
    >
      {initials(name)}
    </span>
  );
}

export function Card({
  title,
  action,
  children,
  className,
  as: As = 'section',
  titleId,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
  titleId?: string;
}) {
  return (
    <As
      className={cn('rounded-card border border-border bg-surface p-4 md:p-5', className)}
      aria-labelledby={title && titleId ? titleId : undefined}
    >
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? (
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </As>
  );
}

export function KpiTile({
  label,
  value,
  sub,
  tone = 'neutral',
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-card border border-border bg-surface p-3 md:p-4',
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-sm text-muted">
        {icon ? (
          <span className={cn('inline-flex', toneText[tone])} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </span>
      <span className="tabular text-2xl font-bold leading-tight md:text-[28px]">{value}</span>
      {sub ? <span className="text-sm text-muted">{sub}</span> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  valueText,
  tone = 'primary',
  className,
}: {
  value: number;
  label: string;
  valueText?: string;
  tone?: 'primary' | 'success' | 'warning' | 'accent';
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={valueText ?? `${pct}%`}
        className="h-3 w-full overflow-hidden rounded-full bg-ink/8"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-200',
            tone === 'primary' && 'bg-primary',
            tone === 'success' && 'bg-success',
            tone === 'warning' && 'bg-warning',
            tone === 'accent' && 'bg-accent',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Circular progress (pledges header). Accent is decorative; the value is printed in the centre. */
export function Ring({
  value,
  size = 112,
  label,
  children,
}: {
  value: number;
  size?: number;
  label: string;
  children?: ReactNode;
}) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--hp-primary)"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </span>
    </div>
  );
}

export function Chip({
  pressed,
  onClick,
  children,
  count,
  className,
}: {
  pressed?: boolean;
  onClick?: () => void;
  children: ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
        pressed
          ? 'border-primary bg-primary text-on-primary'
          : 'border-border bg-surface text-ink hover:bg-bg',
        className,
      )}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            'tabular rounded-full px-1.5 text-xs',
            pressed ? 'bg-on-primary/20' : 'bg-ink/8',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export type BannerTone = 'info' | 'warning' | 'offline' | 'error' | 'success';

const bannerStyle: Record<BannerTone, { cls: string; icon: ReactNode }> = {
  info: {
    cls: 'border-info/30 bg-info/8',
    icon: <Info className="size-5 text-info" aria-hidden="true" />,
  },
  warning: {
    cls: 'border-warning/40 bg-warning/10',
    icon: <AlertTriangle className="size-5 text-warning" aria-hidden="true" />,
  },
  offline: {
    cls: 'border-ink/20 bg-ink/6',
    icon: <WifiOff className="size-5 text-ink" aria-hidden="true" />,
  },
  error: {
    cls: 'border-danger/30 bg-danger/8',
    icon: <XCircle className="size-5 text-danger" aria-hidden="true" />,
  },
  success: {
    cls: 'border-success/30 bg-success/10',
    icon: <CheckCircle2 className="size-5 text-success" aria-hidden="true" />,
  },
};

export function Banner({
  tone = 'info',
  title,
  children,
  action,
  className,
  live,
}: {
  tone?: BannerTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  live?: 'polite' | 'assertive';
}) {
  const s = bannerStyle[tone];
  return (
    <div
      role={live === 'assertive' ? 'alert' : live ? 'status' : undefined}
      className={cn('flex items-start gap-3 rounded-card border p-3 text-ink', s.cls, className)}
    >
      <span className="mt-0.5 shrink-0">{s.icon}</span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-sm">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

/** Illustration-free empty state: icon, one sentence, one primary action (§17.10). */
export function EmptyState({
  icon,
  title,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <span
        className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className="max-w-sm text-base text-ink">{title}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className, lines }: { className?: string; lines?: number }) {
  if (lines) {
    return (
      <div className="flex flex-col gap-2" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn('skeleton h-4 rounded', i === lines - 1 && 'w-2/3', className)}
          />
        ))}
      </div>
    );
  }
  return <div className={cn('skeleton rounded-input', className)} aria-hidden="true" />;
}

export function SectionTitle({
  children,
  id,
  className,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <h2 id={id} className={cn('text-lg font-semibold', className)}>
      {children}
    </h2>
  );
}

export function KeyValue({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
