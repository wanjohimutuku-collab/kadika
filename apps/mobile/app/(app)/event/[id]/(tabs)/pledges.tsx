import { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useGlobalSearchParams } from 'expo-router';
import {
  useEvent,
  usePledgeSummary,
  useRecordPayment,
  useSetPledge,
  type ManualMethod,
} from '../../../../../src/lib/queries';
import { getRepository } from '../../../../../src/lib/repo';
import { useCountryT } from '../../../../../src/lib/i18n';
import { formatMoney } from '../../../../../src/lib/format';
import { useEventLocale } from '../../../../../src/lib/country';
import { useColors } from '../../../../../src/lib/theme';
import {
  Banner,
  ConfirmSheet,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  FunnelBar,
  Pill,
  Row,
  Screen,
  Segmented,
  Sheet,
  Skeleton,
  Txt,
} from '../../../../../src/ui/kit';

const METHODS: ManualMethod[] = ['cash', 'mpesa', 'mixx', 'airtel', 'halopesa', 'bank'];
const METHOD_LABEL: Record<ManualMethod, string> = {
  cash: 'Cash',
  mpesa: 'M-Pesa',
  mixx: 'Mixx',
  airtel: 'Airtel',
  halopesa: 'HaloPesa',
  bank: 'Bank',
};
type Filter = 'all' | 'paid' | 'partial' | 'unpaid';
const TONE = { paid: 'success', partial: 'warning', pledged: 'neutral', waived: 'info' } as const;

/** Michango (§17.4): totals, who owes what, record a payment, export. Hidden from gate agents. */
export default function Pledges() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { currency, country } = useEventLocale(id);
  const t = useCountryT(country);
  const c = useColors();
  const ev = useEvent(id);
  const q = usePledgeSummary(id);
  const record = useRecordPayment(id);
  const setPledge = useSetPledge(id);
  const [filter, setFilter] = useState<Filter>('all');
  const [sheet, setSheet] = useState<'pay' | 'pledge' | null>(null);
  const [confirmRemind, setConfirmRemind] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<ManualMethod>('cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [key, setKey] = useState(
    () => `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  );

  const rows = q.data?.guests ?? [];
  const shown = useMemo(
    () =>
      rows.filter((r) => {
        if (filter === 'paid') return r.status === 'paid';
        if (filter === 'partial') return r.status === 'partial';
        if (filter === 'unpaid') return r.status === 'pledged';
        return r.status !== null;
      }),
    [rows, filter],
  );
  const picked = rows.find((r) => r.guestId === guestId) ?? null;
  const matches =
    search.trim().length >= 2
      ? rows
          .filter((r) =>
            (r.displayName + r.shortCode).toLowerCase().includes(search.trim().toLowerCase()),
          )
          .slice(0, 8)
      : [];
  const total = q.data?.totals;
  const target = total?.targetAmount || total?.pledged || 0;

  const reset = () => {
    setSheet(null);
    setGuestId(null);
    setSearch('');
    setAmount('');
    setReference('');
    setNote('');
    setErr(null);
    setKey(`pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  };

  const savePayment = async () => {
    const n = Number(amount.replace(/[, ]/g, ''));
    if (!picked) return setErr(t('validation.guest.required'));
    if (!Number.isInteger(n) || n < 1) return setErr(t('validation.amount.positive'));
    try {
      await record.mutateAsync({
        guestId: picked.guestId,
        amount: n,
        method,
        reference: reference.trim(),
        note: note.trim(),
        key,
      });
      setMsg(t('pledges.saved', { amount: formatMoney(n, currency), name: picked.displayName }));
      reset();
    } catch (e) {
      setErr(
        (e as { code?: string }).code === 'conflict'
          ? t('pledges.reference') + ': ' + t('guestForm.duplicatePhone')
          : t('states.errorBody'),
      );
    }
  };

  const savePledge = async () => {
    const n = Number(amount.replace(/[, ]/g, ''));
    if (!picked) return setErr(t('validation.guest.required'));
    if (!Number.isInteger(n) || n < 0) return setErr(t('validation.amount.invalid'));
    try {
      await setPledge.mutateAsync({ guestId: picked.guestId, amount: n });
      setMsg(`${t('pledges.pledged')}: ${formatMoney(n, currency)} · ${picked.displayName}`);
      reset();
    } catch {
      setErr(t('states.errorBody'));
    }
  };

  const owing = rows.filter((r) => r.balance > 0);
  const remind = async () => {
    try {
      const r = await getRepository().sendPledgeReminders(
        id,
        owing.map((o) => o.guestId),
      );
      setMsg(t('pledges.reminded', { count: r.queued }));
    } catch {
      setMsg(t('states.errorBody'));
    }
  };

  const exportCsv = async () => {
    try {
      const blob = await getRepository().exportCsv(id, 'pledges');
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'michango.csv';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } else {
        const text = await blob.text();
        const uri = `${FileSystem.cacheDirectory}michango-${Date.now()}.csv`;
        await FileSystem.writeAsStringAsync(uri, text);
        if (await Sharing.isAvailableAsync())
          await Sharing.shareAsync(uri, { mimeType: 'text/csv' });
        else await Clipboard.setStringAsync(text);
      }
    } catch {
      setMsg(t('states.errorBody'));
    }
  };

  return (
    <Screen
      footer={<Button icon="plus" label={t('pledges.record')} onPress={() => setSheet('pay')} />}
    >
      {msg ? <Banner tone="success" text={msg} /> : null}
      {q.isPending ? (
        <>
          <Skeleton height={120} />
          <Skeleton />
        </>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <View style={{ gap: 4 }}>
            <Txt size={14} color={c.muted}>
              {t('pledges.collected')}
            </Txt>
            <Txt size={28} bold>
              {formatMoney(total!.collected, currency)}
            </Txt>
            <Txt size={14} color={c.muted}>
              {t('pledges.target')}: {formatMoney(total!.targetAmount, currency)} ·{' '}
              {t('pledges.pledged')}: {formatMoney(total!.pledged, currency)} ·{' '}
              {t('pledges.balance')}: {formatMoney(total!.balance, currency)}
            </Txt>
            <FunnelBar
              steps={[
                {
                  label: t('pledges.ofTarget', {
                    pct: target ? Math.min(100, Math.round((total!.collected / target) * 100)) : 0,
                  }),
                  value: total!.collected,
                },
              ]}
            />
          </View>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('pledges.tabs.all') },
              { value: 'paid', label: t('pledges.tabs.paid') },
              { value: 'partial', label: t('pledges.tabs.partial') },
              { value: 'unpaid', label: t('pledges.tabs.unpaid') },
            ]}
          />
          {shown.length === 0 ? (
            <EmptyState text={t('pledges.empty')} />
          ) : (
            shown.map((r) => (
              <Row
                key={r.guestId}
                onPress={() => {
                  setGuestId(r.guestId);
                  setAmount(String(r.amount || ''));
                  setSheet('pledge');
                }}
                label={r.displayName}
              >
                <View style={{ flex: 1 }}>
                  <Txt bold numberOfLines={1}>
                    {r.displayName}
                  </Txt>
                  <Txt size={14} color={c.muted}>
                    {t('pledges.pledged')} {formatMoney(r.amount, currency)} · {t('pledges.paid')}{' '}
                    {formatMoney(r.paid, currency)}
                    {r.balance > 0
                      ? ` · ${t('pledges.balance')} ${formatMoney(r.balance, currency)}`
                      : ''}
                  </Txt>
                </View>
                {r.status ? (
                  <Pill label={t(`pledges.status.${r.status}`)} tone={TONE[r.status]} />
                ) : null}
              </Row>
            ))
          )}
          {owing.length > 0 ? (
            <Button
              variant="secondary"
              label={`${t('pledges.remind')} (${owing.length})`}
              onPress={() => setConfirmRemind(true)}
            />
          ) : null}
          <Button variant="secondary" label={t('pledges.export')} onPress={exportCsv} />
          {ev.data && !ev.data.pledgesEnabled ? (
            <Banner tone="warning" text={t('settings.pledgesEnabled')} />
          ) : null}
        </>
      )}

      <ConfirmSheet
        open={confirmRemind}
        title={t('pledges.remindTitle', { count: owing.length })}
        body={t('pledges.remindBody')}
        confirmLabel={t('pledges.remind')}
        onClose={() => setConfirmRemind(false)}
        onConfirm={remind}
      />
      <Sheet open={sheet === 'pay'} onClose={reset} title={t('pledges.recordTitle')}>
        {picked ? (
          <Row onPress={() => setGuestId(null)} label={picked.displayName}>
            <Txt bold>{picked.displayName}</Txt>
          </Row>
        ) : (
          <>
            <Field
              label={t('pledges.searchGuest')}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {matches.map((m) => (
              <Row
                key={m.guestId}
                onPress={() => {
                  setGuestId(m.guestId);
                  setAmount(m.balance ? String(m.balance) : '');
                }}
                label={m.displayName}
              >
                <View style={{ flex: 1 }}>
                  <Txt bold>{m.displayName}</Txt>
                  <Txt size={14} color={c.muted}>
                    {m.shortCode}
                    {m.balance
                      ? ` · ${t('pledges.balance')} ${formatMoney(m.balance, currency)}`
                      : ''}
                  </Txt>
                </View>
              </Row>
            ))}
          </>
        )}
        <Field
          label={t('pledges.amount')}
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
        />
        <Txt size={14} bold>
          {t('pledges.method')}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {METHODS.map((m) => (
            <Chip
              key={m}
              label={METHOD_LABEL[m]}
              active={m === method}
              onPress={() => setMethod(m)}
            />
          ))}
        </View>
        <Field
          label={t('pledges.reference')}
          value={reference}
          onChangeText={setReference}
          autoCapitalize="characters"
        />
        <Field label={t('pledges.note')} value={note} onChangeText={setNote} />
        {err ? <Banner tone="danger" text={err} /> : null}
        <Button label={t('pledges.save')} loading={record.isPending} onPress={savePayment} />
      </Sheet>

      <Sheet
        open={sheet === 'pledge'}
        onClose={reset}
        title={`${t('pledges.pledged')}: ${picked?.displayName ?? ''}`}
      >
        <Field
          label={t('pledges.amount')}
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
        />
        {err ? <Banner tone="danger" text={err} /> : null}
        <Button label={t('common.save')} loading={setPledge.isPending} onPress={savePledge} />
        <Button variant="secondary" label={t('pledges.record')} onPress={() => setSheet('pay')} />
      </Sheet>
    </Screen>
  );
}
