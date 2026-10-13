'use client';

import { useState, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './button';

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
  /** Wide sheets (forms, tables) on desktop. */
  size?: 'md' | 'lg';
}

/** Slides up from the bottom on phones, centred dialog on ≥ 768 px (§17.13). Built on Radix Dialog. */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel,
  size = 'md',
}: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fade-in fixed inset-0 z-40 bg-ink/45" />
        <Dialog.Content
          className={cn(
            'sheet-in fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl bg-surface shadow-xl outline-none',
            'md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl',
            size === 'md' ? 'md:max-w-lg' : 'md:max-w-2xl',
          )}
        >
          <div
            className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border md:hidden"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 md:px-6 md:pt-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-2 inline-flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-ink/6"
              aria-label={closeLabel}
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6">{children}</div>
          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 md:flex-row md:justify-end md:px-6">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface ConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Names the object and the consequence (§17.10 Destructive). */
  consequence: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
  tone?: 'danger' | 'primary';
  /** When set, the user must type this exact text to enable the confirm button. */
  typedConfirmation?: { expected: string; label: string };
  loading?: boolean;
  closeLabel: string;
}

export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  consequence,
  confirmLabel,
  cancelLabel,
  onConfirm,
  tone = 'danger',
  typedConfirmation,
  loading,
  closeLabel,
}: ConfirmSheetProps) {
  const [typed, setTyped] = useState('');
  const blocked = typedConfirmation ? typed.trim() !== typedConfirmation.expected : false;
  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setTyped('');
        onOpenChange(o);
      }}
      title={title}
      closeLabel={closeLabel}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone}
            onClick={() => void onConfirm()}
            disabled={blocked}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="text-base">{consequence}</div>
        {typedConfirmation ? (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {typedConfirmation.label}
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="min-h-12 rounded-input border border-border bg-surface px-3 text-base font-normal"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        ) : null}
      </div>
    </BottomSheet>
  );
}

export interface SearchSheetProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  placeholderLabel: string;
  query: string;
  onQueryChange: (q: string) => void;
  results: T[];
  renderResult: (item: T) => ReactNode;
  getKey: (item: T) => string;
  empty: ReactNode;
  closeLabel: string;
  loading?: boolean;
}

/** Full-height search with instant results (manual check-in, record payment). */
export function SearchSheet<T>({
  open,
  onOpenChange,
  title,
  placeholderLabel,
  query,
  onQueryChange,
  results,
  renderResult,
  getKey,
  empty,
  closeLabel,
  loading,
}: SearchSheetProps<T>) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      closeLabel={closeLabel}
      size="lg"
    >
      <div className="sticky top-0 z-10 -mx-1 bg-surface px-1 pb-2">
        <label className="relative block">
          <span className="sr-only">{placeholderLabel}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholderLabel}
            className="min-h-12 w-full rounded-input border border-border bg-surface pr-3 pl-10 text-base"
          />
        </label>
      </div>
      <ul className="flex flex-col divide-y divide-border" aria-busy={loading || undefined}>
        {results.length ? (
          results.map((r) => <li key={getKey(r)}>{renderResult(r)}</li>)
        ) : (
          <li className="py-8 text-center text-muted">{empty}</li>
        )}
      </ul>
    </BottomSheet>
  );
}
