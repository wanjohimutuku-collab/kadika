'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { matchesSearch, type Guest } from '@harusi/api-client';
import type { PaymentMethod } from '@harusi/schemas';
import { BottomSheet } from '@/components/ui/overlay';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/display';
import { TextField } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { getRepository, newIdempotencyKey } from '@/lib/repo';
import { eventScopedKeys, qk } from '@/lib/queries';
import { formatTzs } from '@/lib/format';
import { cn } from '@/lib/cn';

const METHODS: PaymentMethod[] = ['mpesa', 'mixx', 'airtel', 'cash', 'bank'];

/**
 * "Rekodi malipo" (§17.4): guest search → amount → method → note/reference. Optimistic balance update
 * in the cached guest list, rolled back with a toast if saving fails.
 */
export function RecordPaymentSheet({
  eventId,
  open,
  onOpenChange,
  preselected,
  onSaved,
}: {
  eventId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preselected?: Guest;
  onSaved?: () => void;
}) {
  const t = useTranslations('pledges');
  const tp = useTranslations('pay');
  const tv = useTranslations('validation');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const toast = useToast();
  const queryClient = useQueryClient();
  const guests = useQuery({
    queryKey: qk.guests(eventId),
    queryFn: () => getRepository().listGuests(eventId),
    enabled: open && !preselected,
  });
  const [guest, setGuest] = useState<Guest | null>(preselected ?? null);
  const [q, setQ] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const idem = useRef(newIdempotencyKey());
  const chosen = preselected ?? guest;

  const results = useMemo(
    () => (q.trim() ? (guests.data ?? []).filter((g) => matchesSearch(g, q)).slice(0, 20) : []),
    [guests.data, q],
  );

  const reset = () => {
    setGuest(preselected ?? null);
    setQ('');
    setAmount('');
    setReference('');
    setNote('');
    setError(null);
    idem.current = newIdempotencyKey();
  };

  const save = useMutation({
    mutationFn: (n: number) =>
      getRepository().recordManualPayment(
        eventId,
        { guestId: chosen!.id, amountTzs: n, method, reference, note },
        idem.current,
      ),
    onMutate: async (n) => {
      await queryClient.cancelQueries({ queryKey: qk.guests(eventId) });
      const prev = queryClient.getQueryData<Guest[]>(qk.guests(eventId));
      queryClient.setQueryData<Guest[]>(qk.guests(eventId), (l) =>
        l?.map((g) =>
          g.id === chosen!.id && g.pledge
            ? {
                ...g,
                pledge: {
                  ...g.pledge,
                  paidTzs: g.pledge.paidTzs + n,
                  balanceTzs: Math.max(0, g.pledge.balanceTzs - n),
                },
              }
            : g,
        ),
      );
      return { prev };
    },
    onError: (_e, _n, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(qk.guests(eventId), ctx.prev);
      toast({ tone: 'error', title: ts('rolledBack') });
    },
    onSuccess: async (p) => {
      toast({
        tone: 'success',
        title: t('saved', { amount: formatTzs(p.amountTzs), name: p.guestName }),
      });
      onOpenChange(false);
      reset();
      await Promise.all(
        [...eventScopedKeys(eventId), qk.guest(p.guestId), qk.guestAudit(p.guestId)].map((k) =>
          queryClient.invalidateQueries({ queryKey: k }),
        ),
      );
      onSaved?.();
    },
  });

  const submit = () => {
    const n = Number(amount.replace(/\D/g, ''));
    if (!chosen) return setError(tv('guest.required'));
    if (!n) return setError(tv('amount.invalid'));
    setError(null);
    save.mutate(n);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title={t('recordTitle')}
      closeLabel={tc('close')}
      size="lg"
      footer={
        <Button
          onClick={submit}
          loading={save.isPending}
          disabled={!chosen}
          data-testid="payment-save"
        >
          {t('save')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4" data-testid="record-payment">
        {chosen ? (
          <div className="flex items-center gap-3 rounded-card border border-border p-3">
            <Avatar name={chosen.displayName} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{chosen.displayName}</p>
              <p className="text-sm text-muted">
                {chosen.shortCode}
                {chosen.pledge ? ` · ${t('balance')} ${formatTzs(chosen.pledge.balanceTzs)}` : ''}
              </p>
            </div>
            {!preselected ? (
              <Button size="sm" variant="ghost" onClick={() => setGuest(null)}>
                {tc('edit')}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="relative block">
              <span className="mb-1.5 block text-sm font-semibold">{t('chooseGuest')}</span>
              <Search
                className="pointer-events-none absolute bottom-3.5 left-3 size-5 text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('searchGuest')}
                className="min-h-12 w-full rounded-input border border-border bg-surface pr-3 pl-10"
                autoFocus
                data-testid="payment-guest-search"
              />
            </label>
            <ul className="flex max-h-60 flex-col divide-y divide-border overflow-y-auto">
              {results.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    className="flex min-h-14 w-full items-center gap-3 px-1 text-left hover:bg-bg"
                    onClick={() => setGuest(g)}
                  >
                    <Avatar name={g.displayName} size={32} />
                    <span className="flex-1">
                      <span className="block font-medium">{g.displayName}</span>
                      <span className="text-sm text-muted">
                        {g.shortCode}
                        {g.pledge ? ` · ${formatTzs(g.pledge.balanceTzs)}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <TextField
          label={t('amount')}
          prefix="TZS"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          name="amount"
        />
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t('method')}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {METHODS.map((m) => (
              <label
                key={m}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-2 rounded-input border-2 px-3 font-medium',
                  method === m ? 'border-primary bg-primary/6' : 'border-border',
                )}
              >
                <input
                  type="radio"
                  name="pay-method"
                  checked={method === m}
                  onChange={() => setMethod(m)}
                  className="size-5 accent-[var(--hp-primary)]"
                />
                {tp(`providers.${m}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label={t('reference')}
            optionalLabel={tc('optional')}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <TextField
            label={t('note')}
            optionalLabel={tc('optional')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}
