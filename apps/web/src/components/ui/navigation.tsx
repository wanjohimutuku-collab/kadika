'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Switch as RadixSwitch, Tabs as RadixTabs } from 'radix-ui';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

/** Single-choice segmented control (radiogroup semantics, arrow-key navigation). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (i: number, e: KeyboardEvent) => {
    const dir =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex w-full gap-1 overflow-x-auto rounded-input bg-ink/6 p-1', className)}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(i, e)}
            className={cn(
              'flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 text-sm font-semibold transition-colors',
              active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
            {o.count !== undefined ? (
              <span className="tabular text-xs text-muted">{o.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs({
  value,
  onValueChange,
  items,
  label,
  children,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  items: { value: string; label: ReactNode; count?: number }[];
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <RadixTabs.List
        aria-label={label}
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {items.map((it) => (
          <RadixTabs.Trigger
            key={it.value}
            value={it.value}
            className="-mb-px inline-flex min-h-12 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 font-semibold text-muted data-[state=active]:border-primary data-[state=active]:text-ink"
          >
            {it.label}
            {it.count !== undefined ? (
              <span className="tabular rounded-full bg-ink/8 px-1.5 text-xs">{it.count}</span>
            ) : null}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabPanel = RadixTabs.Content;

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-1">
      <label htmlFor={id} className="flex min-w-0 flex-col">
        <span className="font-medium">{label}</span>
        {description ? (
          <span id={`${id}-d`} className="text-sm text-muted">
            {description}
          </span>
        ) : null}
      </label>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-d` : undefined}
        className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-ink/25 transition-colors data-[state=checked]:bg-primary disabled:opacity-50"
      >
        <RadixSwitch.Thumb className="block size-6 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-7" />
      </RadixSwitch.Root>
    </div>
  );
}
