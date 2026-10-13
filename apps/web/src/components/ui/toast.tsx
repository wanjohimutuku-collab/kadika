'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Toast } from 'radix-ui';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

const Ctx = createContext<((t: ToastOptions) => void) | null>(null);

export function useToast(): (t: ToastOptions) => void {
  const fn = useContext(Ctx);
  if (!fn) throw new Error('useToast must be used inside <ToastProvider>');
  return fn;
}

/** Snackbar stack (Radix Toast) — undo actions and optimistic-rollback notices (§17.10). */
export function ToastProvider({
  children,
  closeLabel,
}: {
  children: ReactNode;
  closeLabel: string;
}) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback(
    (t: ToastOptions) =>
      setItems((xs) => [...xs.slice(-2), { ...t, id: Date.now() + Math.random() }]),
    [],
  );
  const value = useMemo(() => push, [push]);
  return (
    <Ctx.Provider value={value}>
      <Toast.Provider swipeDirection="down" duration={5000}>
        {children}
        {items.map((t) => (
          <Toast.Root
            key={t.id}
            duration={t.durationMs ?? (t.action ? 8000 : 5000)}
            onOpenChange={(open) => {
              if (!open) setItems((xs) => xs.filter((x) => x.id !== t.id));
            }}
            className={cn(
              'fade-in flex w-full items-start gap-3 rounded-card border bg-ink p-3 text-white shadow-lg',
              t.tone === 'error' && 'border-danger',
              t.tone !== 'error' && 'border-ink',
            )}
          >
            <span className="mt-0.5 shrink-0" aria-hidden="true">
              {t.tone === 'error' ? (
                <XCircle className="size-5 text-[#FF8A80]" />
              ) : t.tone === 'success' ? (
                <CheckCircle2 className="size-5 text-[#5BD17F]" />
              ) : (
                <Info className="size-5 text-[#7DB8F5]" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <Toast.Title className="font-semibold">{t.title}</Toast.Title>
              {t.description ? (
                <Toast.Description className="text-sm text-white/85">
                  {t.description}
                </Toast.Description>
              ) : null}
            </div>
            {t.action ? (
              <Toast.Action altText={t.action.label} asChild>
                <button
                  type="button"
                  onClick={t.action.onClick}
                  className="min-h-10 shrink-0 rounded-input px-3 font-semibold text-[#D9B26A] underline-offset-2 hover:underline"
                >
                  {t.action.label}
                </button>
              </Toast.Action>
            ) : null}
            <Toast.Close
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
              aria-label={closeLabel}
            >
              <X className="size-4" aria-hidden="true" />
            </Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed inset-x-0 bottom-20 z-[60] mx-auto flex w-full max-w-md flex-col gap-2 px-4 outline-none md:right-4 md:bottom-4 md:left-auto md:mx-0" />
      </Toast.Provider>
    </Ctx.Provider>
  );
}
