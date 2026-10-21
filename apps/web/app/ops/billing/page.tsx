'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import type { OpsPurchase, PricingCatalog } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { DataTable, OpsPage, Td, Th, useStaffCan } from '@/components/ops/ops-ui';
import { Button, IconButton } from '@/components/ui/button';
import { Banner, Card, Skeleton, StatusPill } from '@/components/ui/display';
import { TextField } from '@/components/ui/form';
import { Switch } from '@/components/ui/navigation';
import { BottomSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { OPS_ALL, qk } from '@/lib/queries';
import { formatDateTimeShort, formatMoney } from '@/lib/format';

const STATUS_TONE = {
  pending: 'warning',
  paid: 'success',
  failed: 'danger',
  cancelled: 'neutral',
} as const;

/** Staff billing (ADR 042): orders to confirm, and the prices for cards and messages. */
export default function OpsBillingPage() {
  const t = useTranslations('ops.purchases');
  const tb = useTranslations('billing');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const canPlan = useStaffCan('plan');
  const orders = useQuery({
    queryKey: qk.ops('purchases'),
    queryFn: () => getRepository().opsListPurchases(),
  });
  const [confirming, setConfirming] = useState<OpsPurchase | null>(null);
  const [note, setNote] = useState('');
  const markPaid = useMutation({
    mutationFn: () => getRepository().opsMarkPurchasePaid(confirming!.id, note.trim()),
    onSuccess: async () => {
      setConfirming(null);
      setNote('');
      toast({ tone: 'success', title: tb('paidToast') });
      await queryClient.invalidateQueries({ queryKey: OPS_ALL });
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  return (
    <OpsPage title={t('title')}>
      <QueryState query={orders} skeleton={<Skeleton className="h-48" />}>
        {(rows) =>
          rows.length === 0 ? (
            <p className="text-muted">{t('empty')}</p>
          ) : (
            <DataTable
              label={t('title')}
              minWidth={900}
              head={
                <tr>
                  <Th>{t('col.date')}</Th>
                  <Th>{t('col.order')}</Th>
                  <Th right>{t('col.amount')}</Th>
                  <Th>{t('col.method')}</Th>
                  <Th>{t('col.status')}</Th>
                  <Th>
                    <span className="sr-only">{t('col.action')}</span>
                  </Th>
                </tr>
              }
            >
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border" data-testid="ops-purchase-row">
                  <Td muted>{formatDateTimeShort(p.createdAt, locale)}</Td>
                  <Td>
                    <span className="font-medium">{p.eventName}</span>
                    <span className="block text-sm text-muted">
                      {p.label}
                      {p.reference ? ` · ${p.reference}` : ''}
                    </span>
                  </Td>
                  <Td right>
                    {p.kind === 'grant' ? tb('grant') : formatMoney(p.amount, p.currency)}
                  </Td>
                  <Td muted>
                    {p.method === 'mobile'
                      ? tb('methodMobile')
                      : p.method === 'manual'
                        ? tb('methodManual')
                        : tb('grant')}
                  </Td>
                  <Td>
                    <StatusPill tone={STATUS_TONE[p.status]}>{tb(`status.${p.status}`)}</StatusPill>
                  </Td>
                  <Td>
                    {canPlan && (p.status === 'pending' || p.status === 'failed') ? (
                      <Button size="sm" variant="ghost" onClick={() => setConfirming(p)}>
                        {t('markPaid')}
                      </Button>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </DataTable>
          )
        }
      </QueryState>

      <PricingEditor />

      <BottomSheet
        open={!!confirming}
        onOpenChange={(o) => !o && setConfirming(null)}
        closeLabel={tc('close')}
        title={confirming ? t('markPaidTitle', { item: confirming.label }) : ''}
        description={
          confirming
            ? `${confirming.eventName} · ${formatMoney(confirming.amount, confirming.currency)}`
            : ''
        }
        footer={
          <Button
            className="w-full"
            disabled={note.trim().length < 3}
            loading={markPaid.isPending}
            onClick={() => markPaid.mutate()}
          >
            {t('confirm')}
          </Button>
        }
      >
        <TextField label={t('note')} value={note} onChange={(e) => setNote(e.target.value)} />
      </BottomSheet>
    </OpsPage>
  );
}

const int = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

function PricingEditor() {
  const t = useTranslations('ops.pricing');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const canPlan = useStaffCan('plan');
  const pricing = useQuery({
    queryKey: qk.ops('pricing'),
    queryFn: () => getRepository().opsPricing(),
  });
  const [draft, setDraft] = useState<PricingCatalog | null>(null);
  useEffect(() => {
    if (pricing.data && !draft) setDraft(structuredClone(pricing.data.catalog));
  }, [pricing.data, draft]);
  const save = useMutation({
    mutationFn: () => getRepository().opsSavePricing(draft!),
    onSuccess: async (v) => {
      setDraft(structuredClone(v.catalog));
      toast({ tone: 'success', title: t('saved') });
      await queryClient.invalidateQueries({ queryKey: OPS_ALL });
    },
    onError: (e) =>
      toast({
        tone: 'error',
        title: ts('errorTitle'),
        description: (e as { message?: string }).message,
      }),
  });

  const edit = (fn: (c: PricingCatalog) => void) =>
    setDraft((d) => {
      if (!d) return d;
      const c = structuredClone(d);
      fn(c);
      return c;
    });
  const ro = !canPlan;
  const num = (label: string, value: number, set: (n: number) => void) => (
    <TextField
      label={label}
      type="number"
      inputMode="numeric"
      min={0}
      value={String(value)}
      disabled={ro}
      onChange={(e) => set(int(e.target.value))}
    />
  );

  return (
    <Card title={t('title')} titleId="pricing-h" className="mt-6">
      <p className="mb-4 text-muted">{t('intro')}</p>
      {ro ? (
        <Banner tone="info" className="mb-4">
          {t('readOnly')}
        </Banner>
      ) : null}
      <QueryState query={pricing} skeleton={<Skeleton lines={6} />}>
        {(v) =>
          !draft ? null : (
            <div className="flex flex-col gap-6">
              <p className="text-sm text-muted">
                {v.source === 'default'
                  ? t('source.default')
                  : t('source.database', {
                      name: v.updatedBy ?? '—',
                      when: v.updatedAt ? formatDateTimeShort(v.updatedAt, locale) : '—',
                    })}
              </p>
              <Switch
                checked={draft.enforced}
                onCheckedChange={(on) => edit((c) => void (c.enforced = on))}
                label={t('enforced')}
                description={t('enforcedHint')}
                disabled={ro}
              />
              <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <legend className="mb-2 font-semibold">{t('free')}</legend>
                {num(t('cards'), draft.free.cards, (n) => edit((c) => void (c.free.cards = n)))}
                {num(t('sms'), draft.free.sms, (n) => edit((c) => void (c.free.sms = n)))}
                {num(t('whatsapp'), draft.free.whatsapp, (n) =>
                  edit((c) => void (c.free.whatsapp = n)),
                )}
              </fieldset>

              <section aria-labelledby="pricing-bundles" className="flex flex-col gap-3">
                <h3 id="pricing-bundles" className="font-semibold">
                  {t('bundles')}
                </h3>
                {draft.bundles.map((b, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 items-end gap-3 rounded-card border border-border p-3 md:grid-cols-8"
                  >
                    <TextField
                      label={t('key')}
                      value={b.key}
                      disabled={ro}
                      onChange={(e) => edit((c) => void (c.bundles[i]!.key = e.target.value))}
                    />
                    <TextField
                      label={t('name')}
                      value={b.name}
                      disabled={ro}
                      onChange={(e) => edit((c) => void (c.bundles[i]!.name = e.target.value))}
                    />
                    {num(t('cards'), b.cards, (n) => edit((c) => void (c.bundles[i]!.cards = n)))}
                    {num(t('sms'), b.sms, (n) => edit((c) => void (c.bundles[i]!.sms = n)))}
                    {num(t('whatsapp'), b.whatsapp, (n) =>
                      edit((c) => void (c.bundles[i]!.whatsapp = n)),
                    )}
                    {num(t('priceTzs'), b.price.TZS, (n) =>
                      edit((c) => void (c.bundles[i]!.price.TZS = n)),
                    )}
                    {num(t('priceKes'), b.price.KES, (n) =>
                      edit((c) => void (c.bundles[i]!.price.KES = n)),
                    )}
                    {ro ? null : (
                      <IconButton
                        label={t('remove')}
                        icon={<Trash2 className="size-5" aria-hidden="true" />}
                        onClick={() => edit((c) => void c.bundles.splice(i, 1))}
                      />
                    )}
                  </div>
                ))}
                {ro ? null : (
                  <Button
                    variant="secondary"
                    icon={<Plus className="size-5" aria-hidden="true" />}
                    onClick={() =>
                      edit((c) =>
                        c.bundles.push({
                          key: `b${c.bundles.length + 1}`,
                          name: '',
                          cards: 100,
                          sms: 100,
                          whatsapp: 200,
                          price: { TZS: 0, KES: 0 },
                        }),
                      )
                    }
                  >
                    {t('addBundle')}
                  </Button>
                )}
              </section>

              <section aria-labelledby="pricing-packs" className="flex flex-col gap-3">
                <h3 id="pricing-packs" className="font-semibold">
                  {t('packs')}
                </h3>
                {draft.packs.map((p, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 items-end gap-3 rounded-card border border-border p-3 md:grid-cols-6"
                  >
                    <TextField
                      label={t('key')}
                      value={p.key}
                      disabled={ro}
                      onChange={(e) => edit((c) => void (c.packs[i]!.key = e.target.value))}
                    />
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      {t('channel')}
                      <select
                        className="min-h-12 rounded-input border border-border bg-surface px-3 text-base"
                        value={p.channel}
                        disabled={ro}
                        onChange={(e) =>
                          edit(
                            (c) =>
                              void (c.packs[i]!.channel = e.target.value as 'sms' | 'whatsapp'),
                          )
                        }
                      >
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </label>
                    {num(t('messages'), p.messages, (n) =>
                      edit((c) => void (c.packs[i]!.messages = n)),
                    )}
                    {num(t('priceTzs'), p.price.TZS, (n) =>
                      edit((c) => void (c.packs[i]!.price.TZS = n)),
                    )}
                    {num(t('priceKes'), p.price.KES, (n) =>
                      edit((c) => void (c.packs[i]!.price.KES = n)),
                    )}
                    {ro ? null : (
                      <IconButton
                        label={t('remove')}
                        icon={<Trash2 className="size-5" aria-hidden="true" />}
                        onClick={() => edit((c) => void c.packs.splice(i, 1))}
                      />
                    )}
                  </div>
                ))}
                {ro ? null : (
                  <Button
                    variant="secondary"
                    icon={<Plus className="size-5" aria-hidden="true" />}
                    onClick={() =>
                      edit((c) =>
                        c.packs.push({
                          key: `p${c.packs.length + 1}`,
                          channel: 'sms',
                          messages: 100,
                          price: { TZS: 0, KES: 0 },
                        }),
                      )
                    }
                  >
                    {t('addPack')}
                  </Button>
                )}
              </section>
              {ro ? null : (
                <Button
                  className="self-start"
                  loading={save.isPending}
                  onClick={() => save.mutate()}
                >
                  {t('save')}
                </Button>
              )}
            </div>
          )
        }
      </QueryState>
    </Card>
  );
}
