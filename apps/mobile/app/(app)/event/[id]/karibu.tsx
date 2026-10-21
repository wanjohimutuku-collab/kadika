import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { detectNetwork } from '@harusi/schemas/checkout';
import { paymentMethodsFor, type MobileMoneyMethodId } from '@harusi/schemas/country';
import type { PurchaseView } from '@harusi/api-client';
import { getRepository } from '../../../../src/lib/repo';
import { parsePhone } from '../../../../src/lib/country';
import { useEvent } from '../../../../src/lib/queries';
import { useT } from '../../../../src/lib/i18n';
import { formatMoney } from '../../../../src/lib/format';
import { spacing, useColors } from '../../../../src/lib/theme';
import { AppHeader } from '../../../../src/ui/header';
import { Icon } from '../../../../src/ui/icons';
import { Banner, Button, Card, Chip, Field, Screen, Segmented, Txt } from '../../../../src/ui/kit';

const STEPS = ['design', 'names', 'qr', 'ready'] as const;
const STEP_MS = 850;
const QUICK = [50, 100, 200, 300, 500];
const NETWORK_LABEL: Record<MobileMoneyMethodId, string> = {
  mpesa: 'M-Pesa',
  mixx: 'Mixx by Yas',
  airtel: 'Airtel Money',
  halopesa: 'HaloPesa',
};

/**
 * After creating an event (ADR 044, same as the web welcome page): the card is put together step by
 * step, then the host chooses how many cards to buy, or starts with the free ones.
 */
export default function Welcome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const queryClient = useQueryClient();
  const event = useEvent(id);
  const billing = useQuery({
    queryKey: ['billing', id],
    queryFn: () => getRepository().getBilling(id),
  });

  // The "building" moment; instant when the phone asks for reduced motion.
  const [done, setDone] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return setDone(STEPS.length);
      timer = setInterval(() => setDone((d) => (d >= STEPS.length ? d : d + 1)), STEP_MS);
    });
    return () => timer && clearInterval(timer);
  }, []);
  const ready = done >= STEPS.length && !!billing.data;

  const [raw, setRaw] = useState('100');
  const n = Math.min(10_000, Math.max(0, Math.floor(Number(raw) || 0)));
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<'mobile' | 'manual'>('mobile');
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<MobileMoneyMethodId | null>(null);
  const [waiting, setWaiting] = useState<PurchaseView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const country = event.data?.country ?? 'TZ';
  const networks = paymentMethodsFor(country);
  const parsed = parsePhone(phone, country);
  useEffect(() => {
    const guess = detectNetwork(parsed.ok ? parsed.e164 : null);
    if (guess && networks.includes(guess)) setNetwork(guess);
    // Re-guessed only when the number changes, so a network the host picked by hand stays picked.
  }, [phone]);

  const paid = async () => {
    await queryClient.invalidateQueries({ queryKey: ['billing', id] });
    router.replace(`/event/${id}/guests/import`);
  };

  // While the host approves the prompt on this same phone, check every few seconds for up to 90 s.
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    const timer = setInterval(async () => {
      const p = await getRepository()
        .getPurchase(id, waiting.id)
        .catch(() => null);
      if (p && p.status === 'paid') {
        setWaiting(null);
        await paid();
      } else if (p && p.status !== 'pending') {
        setWaiting(null);
        setError(t('billing.failedToast'));
      } else if (Date.now() - started > 90_000) {
        setWaiting(null);
        setError(t('billing.slowToast'));
      }
    }, 3_000);
    return () => clearInterval(timer);
    // One poll per waiting order: re-running on every render would restart the 90 s window.
  }, [waiting?.id]);

  const b = billing.data;
  const each = b
    ? (b.cardTiers.filter((x) => x.minCards <= Math.max(1, n)).at(-1)?.price ??
      b.cardTiers[0]?.price ??
      0)
    : 0;
  const total = n * each;
  const cur = b?.currency ?? 'TZS';
  const canPay = n > 0 && (method === 'manual' || (parsed.ok && !!network));

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await getRepository().orderBilling(
        id,
        method === 'mobile' && parsed.ok
          ? { cards: n, method, phoneE164: parsed.e164, mobileMethod: network! }
          : { cards: n, method: 'manual' },
        Crypto.randomUUID(),
      );
      if (p.status === 'paid') await paid();
      else if (p.method === 'mobile') setWaiting(p);
      else {
        // a bank or cash order waits for staff; the host can carry on with the free cards
        router.replace(`/event/${id}`);
      }
    } catch {
      setError(t('states.errorTitle'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={event.data?.coupleNames ?? ''} />
      <Screen>
        <Card tone="brand" label={t('welcome.eyebrow')}>
          <Txt size={13} bold color={c.onPrimary}>
            {t('welcome.eyebrow').toUpperCase()}
          </Txt>
          <Txt size={26} bold color={c.onPrimary} style={{ marginTop: spacing.sm }}>
            {event.data?.coupleNames ?? ''}
          </Txt>
          <Txt size={18} bold color={c.onPrimary} style={{ marginTop: spacing.md }}>
            {ready ? t('welcome.readyTitle') : t('welcome.buildingTitle')}
          </Txt>
        </Card>

        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('welcome.progressLabel')}
          accessibilityState={{ busy: !ready }}
          accessibilityValue={{ min: 0, max: STEPS.length, now: Math.min(done, STEPS.length) }}
          style={{ gap: spacing.sm, marginVertical: spacing.lg }}
        >
          {STEPS.map((s, i) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              {i < done ? (
                <Icon name="checkCircle" color={c.success} />
              ) : i === done ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <Icon name="clock" color={c.muted} />
              )}
              <Txt color={i < done ? c.ink : c.muted}>{t(`welcome.steps.${s}`)}</Txt>
            </View>
          ))}
        </View>

        {ready && b ? (
          <Card>
            <Txt size={20} bold>
              {t('welcome.offerTitle')}
            </Txt>
            <Txt color={c.muted} style={{ marginTop: spacing.xs }}>
              {t('welcome.offerIntro')}
            </Txt>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.sm,
                marginTop: spacing.md,
              }}
            >
              {QUICK.map((q) => (
                <Chip
                  key={q}
                  label={t('welcome.guests', { n: q })}
                  active={n === q}
                  onPress={() => setRaw(String(q))}
                />
              ))}
            </View>
            <View style={{ marginTop: spacing.md }}>
              <Field
                label={t('welcome.howMany')}
                keyboardType="number-pad"
                value={raw}
                onChangeText={setRaw}
              />
            </View>
            <Txt size={28} bold style={{ marginTop: spacing.sm }}>
              {formatMoney(total, cur)}
            </Txt>
            <Txt color={c.muted}>
              {t('billing.orderDetail', {
                n,
                price: formatMoney(each, cur),
                credits: n * b.messagesPerCard,
              })}
            </Txt>
            <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
              <Txt size={14}>• {t('welcome.point.generated')}</Txt>
              <Txt size={14}>• {t('welcome.point.reminders', { per: b.messagesPerCard })}</Txt>
              <Txt size={14}>• {t('welcome.point.contributions')}</Txt>
            </View>

            {paying ? (
              <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
                {b.mobilePayAvailable ? (
                  <Segmented
                    value={method}
                    onChange={setMethod}
                    options={[
                      { value: 'mobile', label: t('billing.methodMobile') },
                      { value: 'manual', label: t('billing.methodManual') },
                    ]}
                  />
                ) : null}
                {method === 'mobile' && b.mobilePayAvailable ? (
                  <>
                    <Field
                      label={t('billing.phone')}
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                      {networks.map((x) => (
                        <Chip
                          key={x}
                          label={NETWORK_LABEL[x]}
                          active={network === x}
                          onPress={() => setNetwork(x)}
                        />
                      ))}
                    </View>
                    <Txt size={14} color={c.muted}>
                      {t('billing.mobileHint')}
                    </Txt>
                  </>
                ) : (
                  <Banner text={t('billing.manualHint')} />
                )}
                {waiting ? (
                  <Banner text={`${t('billing.waitingTitle')} — ${t('billing.waitingBody')}`} />
                ) : null}
                {error ? <Banner tone="danger" text={error} /> : null}
                <Button
                  label={
                    method === 'mobile' && b.mobilePayAvailable
                      ? t('billing.payNow', { amount: formatMoney(total, cur) })
                      : t('billing.orderManual')
                  }
                  onPress={buy}
                  loading={busy || !!waiting}
                  disabled={!canPay}
                />
              </View>
            ) : (
              <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
                <Button
                  label={t('welcome.buy', { n, total: formatMoney(total, cur) })}
                  onPress={() => {
                    setMethod(b.mobilePayAvailable ? 'mobile' : 'manual');
                    setPaying(true);
                  }}
                  disabled={n < 1}
                />
                <Button
                  variant="ghost"
                  label={t('welcome.skip', { n: b.free.cards })}
                  onPress={() => router.replace(`/event/${id}`)}
                />
              </View>
            )}
          </Card>
        ) : null}
      </Screen>
    </View>
  );
}
