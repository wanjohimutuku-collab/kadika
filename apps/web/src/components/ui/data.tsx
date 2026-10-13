'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  href?: string;
}

/**
 * Horizontal funnel (§17.4, §17.7). Each stage shows its count and share of the first stage; values are
 * printed (no hover needed) and a visually hidden table gives screen readers the same data.
 */
export function FunnelBar({
  stages,
  caption,
  renderLink,
}: {
  stages: FunnelStage[];
  caption: string;
  renderLink?: (s: FunnelStage, children: ReactNode) => ReactNode;
}) {
  const top = Math.max(1, stages[0]?.count ?? 1);
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2" aria-label={caption}>
        {stages.map((s, i) => {
          const pct = Math.round((s.count / top) * 100);
          const row = (
            <div className="grid grid-cols-[minmax(6.5rem,9rem)_1fr_auto] items-center gap-3">
              <span className="truncate text-sm">{s.label}</span>
              <span className="h-6 overflow-hidden rounded-[4px] bg-ink/6" aria-hidden="true">
                <span
                  className="block h-full rounded-[4px] bg-primary"
                  style={{ width: `${pct}%`, opacity: 1 - i * 0.11 }}
                />
              </span>
              <span className="tabular w-20 text-right text-sm font-semibold">
                {s.count} <span className="font-normal text-muted">· {pct}%</span>
              </span>
            </div>
          );
          return <li key={s.key}>{renderLink && s.href ? renderLink(s, row) : row}</li>;
        })}
      </ol>
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
}

/** Lightweight SVG bar chart with labelled values and a text alternative (console only). */
export function BarChart({
  data,
  caption,
  formatValue = String,
  height = 160,
  hideCaption,
}: {
  data: BarDatum[];
  caption: string;
  formatValue?: (n: number) => string;
  height?: number;
  hideCaption?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = 36;
  const gap = 14;
  const width = Math.max(data.length * (bw + gap), 120);
  const chartH = height - 40;
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className={hideCaption ? 'sr-only' : 'text-sm text-muted'}>{caption}</figcaption>
      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          className="max-w-none"
        >
          <line x1={0} x2={width} y1={chartH + 18} y2={chartH + 18} stroke="var(--hp-border)" />
          {data.map((d, i) => {
            const h = Math.round((d.value / max) * chartH);
            const x = i * (bw + gap) + gap / 2;
            return (
              <g key={d.label}>
                <rect
                  x={x}
                  y={chartH + 18 - h}
                  width={bw}
                  height={h}
                  rx={4}
                  fill="var(--hp-primary)"
                />
                <text
                  x={x + bw / 2}
                  y={chartH + 12 - h}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="var(--hp-ink)"
                >
                  {formatValue(d.value)}
                </text>
                <text
                  x={x + bw / 2}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize="12"
                  fill="var(--hp-muted)"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export interface TimelineStep {
  key: string;
  label: string;
  at?: string | null;
  state: 'done' | 'current' | 'pending' | 'skipped';
  note?: ReactNode;
}

export function Timeline({ steps, label }: { steps: TimelineStep[]; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 ? (
            <span
              className={cn(
                'absolute top-7 left-[13px] h-[calc(100%-1.5rem)] w-0.5',
                s.state === 'done' ? 'bg-primary' : 'bg-border',
              )}
              aria-hidden="true"
            />
          ) : null}
          <span
            className={cn(
              'z-[1] flex size-7 shrink-0 items-center justify-center rounded-full border-2',
              s.state === 'done' && 'border-primary bg-primary text-on-primary',
              s.state === 'current' && 'border-primary bg-surface text-primary',
              (s.state === 'pending' || s.state === 'skipped') &&
                'border-border bg-surface text-muted',
            )}
            aria-hidden="true"
          >
            {s.state === 'done' ? (
              <Check className="size-4" />
            ) : (
              <span className="size-2 rounded-full bg-current" />
            )}
          </span>
          <div className="flex min-w-0 flex-col pt-0.5">
            <span
              className={cn(
                'font-medium',
                s.state === 'pending' && 'text-muted',
                s.state === 'skipped' && 'text-muted line-through',
              )}
            >
              {s.label}
            </span>
            {s.at ? <span className="text-sm text-muted">{s.at}</span> : null}
            {s.note ? <span className="text-sm">{s.note}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export interface SwipeAction {
  label: string;
  icon: ReactNode;
  onAction: () => void;
  tone?: 'primary' | 'neutral';
}

/**
 * List row with optional swipe actions (§17.4: left = tuma tena, right = badilisha). Swiping is a
 * shortcut only; the same actions are reachable from the detail screen and the overflow button.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onOpen,
  swipeLeft,
  swipeRight,
  selected,
  onLongPress,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onOpen?: () => void;
  swipeLeft?: SwipeAction;
  swipeRight?: SwipeAction;
  selected?: boolean;
  onLongPress?: () => void;
  className?: string;
}) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dx, setDx] = useState(0);
  const threshold = 72;
  const clearLong = () => {
    if (longTimer.current) clearTimeout(longTimer.current);
    longTimer.current = null;
  };
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {swipeRight && dx > 0 ? (
        <div
          className="absolute inset-y-0 left-0 flex items-center gap-2 bg-primary px-4 text-on-primary"
          style={{ width: dx }}
          aria-hidden="true"
        >
          {swipeRight.icon}
        </div>
      ) : null}
      {swipeLeft && dx < 0 ? (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 bg-accent px-4 text-white"
          style={{ width: -dx }}
          aria-hidden="true"
        >
          {swipeLeft.icon}
        </div>
      ) : null}
      <div
        className={cn(
          'relative flex min-h-16 items-center gap-3 bg-surface px-3 py-2.5 transition-transform',
          selected && 'bg-primary/8',
          onOpen && 'cursor-pointer hover:bg-bg',
        )}
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transitionDuration: start.current ? '0ms' : undefined,
        }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return;
          start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
          if (onLongPress)
            longTimer.current = setTimeout(() => {
              onLongPress();
              start.current = null;
            }, 550);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const mx = e.clientX - start.current.x;
          const my = e.clientY - start.current.y;
          if (Math.abs(mx) > 8 || Math.abs(my) > 8) clearLong();
          if (Math.abs(my) > Math.abs(mx)) return;
          if ((mx > 0 && swipeRight) || (mx < 0 && swipeLeft))
            setDx(Math.max(-120, Math.min(120, mx)));
        }}
        onPointerUp={() => {
          clearLong();
          if (dx >= threshold) swipeRight?.onAction();
          else if (dx <= -threshold) swipeLeft?.onAction();
          start.current = null;
          setDx(0);
        }}
        onPointerCancel={() => {
          clearLong();
          start.current = null;
          setDx(0);
        }}
        onClick={() => {
          if (dx === 0) onOpen?.();
        }}
      >
        {leading}
        <div className="min-w-0 flex-1">
          {onOpen ? (
            // A real button keeps the row reachable by keyboard and screen readers; the row click is a touch shortcut.
            <button
              type="button"
              className="block max-w-full truncate text-left font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
            >
              {title}
            </button>
          ) : (
            <div className="truncate font-medium">{title}</div>
          )}
          {subtitle ? <div className="truncate text-sm text-muted">{subtitle}</div> : null}
        </div>
        {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
      </div>
    </div>
  );
}
