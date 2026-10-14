import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useGlobalSearchParams } from 'expo-router';
import type { SendJob } from '@harusi/api-client';
import { buildInviteSms, estimateSmsCost } from '@harusi/api-client';
import { useEvent, useGuests, useRetryFailed, useSend } from '../../../../../src/lib/queries';
import { useLocale, useT } from '../../../../../src/lib/i18n';
import { formatDate, formatTzs } from '../../../../../src/lib/format';
import { useOnline } from '../../../../../src/lib/network';
import { useColors } from '../../../../../src/lib/theme';
import {
  Banner,
  Button,
  Card,
  ConfirmSheet,
  Kpi,
  Screen,
  Segmented,
  Txt,
} from '../../../../../src/ui/kit';

type Channel = 'auto' | 'whatsapp' | 'sms';

export default function Send() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const { locale } = useLocale();
  const online = useOnline();
  const ev = useEvent(id);
  const guests = useGuests(id, { filter: 'unsent' });
  const send = useSend(id);
  const retry = useRetryFailed(id);
  const [channel, setChannel] = useState<Channel>('auto');
  const [fallback, setFallback] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [job, setJob] = useState<SendJob | null>(null);
  const [key, setKey] = useState(
    () => `send-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  );

  const targets = guests.data ?? [];
  const withPhone = targets.filter((g) => g.phoneE164);
  const sample = useMemo(() => {
    const e = ev.data;
    if (!e) return '';
    return buildInviteSms({
      locale,
      partnerA: e.partnerA,
      partnerB: e.partnerB,
      dateText: formatDate(e.dateStart, locale),
      shortLink: 'harusi.example/s/…',
      code: 'KH-4821',
    });
  }, [ev.data, locale]);
  // Who gets which channel: smartphone guests by WhatsApp, the rest by SMS, unless one is forced.
  const waCount =
    channel === 'sms'
      ? 0
      : withPhone.filter((g) => g.hasSmartphone && g.inviteChannelPref !== 'sms').length;
  const smsCount = withPhone.length - waCount;
  const cost = estimateSmsCost(sample, smsCount);

  const run = async () => {
    try {
      const j = await send.mutateAsync({
        audience: { kind: 'unsent' },
        channel,
        whatsappFallbackToSms: fallback,
        scheduleAt: null,
        kind: 'invite',
        idempotencyKey: key,
      });
      setJob(j);
      setKey(`send-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
    } catch {
      /* the error banner below shows it */
    }
  };

  if (job)
    return (
      <Screen
        footer={
          job.counts.failed > 0 ? (
            <Button
              label={t('send.retryFailed')}
              loading={retry.isPending}
              onPress={async () => setJob(await retry.mutateAsync(job.id))}
            />
          ) : (
            <Button label={t('send.newSend')} onPress={() => setJob(null)} />
          )
        }
      >
        <Txt size={20} bold>
          {t('send.progressDone')}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Kpi label={t('send.counters.sent')} value={job.counts.sent} />
          <Kpi label={t('send.counters.failed')} value={job.counts.failed} />
        </View>
        {job.counts.failed > 0 ? (
          <Banner
            tone="warning"
            text={t('states.partialFailure', { failed: job.counts.failed, total: job.total })}
          />
        ) : null}
        {job.failures.map((f) => (
          <Txt key={f.guestId} size={14} color={c.danger}>
            {f.guestName}: {f.error}
          </Txt>
        ))}
      </Screen>
    );

  return (
    <Screen
      footer={
        <Button
          label={t('send.sendNow')}
          disabled={targets.length === 0 || !online}
          loading={send.isPending}
          onPress={() => setConfirm(true)}
        />
      }
    >
      <Txt size={20} bold>
        {t('send.title')}
      </Txt>
      {!online ? <Banner tone="warning" text={t('send.offline')} /> : null}
      <Card>
        <Txt bold>{t('send.audience')}</Txt>
        <Txt>
          {t('send.audiences.unsent')}: {t('send.recipients', { count: targets.length })}
        </Txt>
        {targets.length - withPhone.length > 0 ? (
          <Txt size={14} color={c.muted}>
            {t('send.withoutPhone', { count: targets.length - withPhone.length })}
          </Txt>
        ) : null}
      </Card>
      <Txt bold>{t('send.channel')}</Txt>
      <Segmented<Channel>
        value={channel}
        onChange={setChannel}
        options={[
          { value: 'auto', label: t('channel.auto') },
          { value: 'whatsapp', label: t('channel.whatsapp') },
          { value: 'sms', label: t('channel.sms') },
        ]}
      />
      {channel === 'auto' ? (
        <Txt size={14} color={c.muted}>
          {t('send.channelAutoHelp')}
        </Txt>
      ) : null}
      <Card>
        <Txt bold>{t('send.preview')}</Txt>
        <Txt size={14}>{sample}</Txt>
        <Txt size={14} color={c.muted}>
          {t('send.smsCost', { cost: formatTzs(cost.costTzs) })}
        </Txt>
      </Card>
      <Segmented<'on' | 'off'>
        value={fallback ? 'on' : 'off'}
        onChange={(v) => setFallback(v === 'on')}
        options={[
          { value: 'on', label: t('send.fallback') },
          { value: 'off', label: t('common.no') },
        ]}
      />
      {send.isError ? <Banner tone="danger" text={t('states.errorBody')} /> : null}
      <ConfirmSheet
        open={confirm}
        title={t('send.confirmTitle', { count: targets.length })}
        body={t('send.confirmBody', {
          whatsapp: waCount,
          sms: smsCount,
          print: targets.length - withPhone.length,
          cost: formatTzs(cost.costTzs),
        })}
        confirmLabel={t('send.sendNow')}
        onClose={() => setConfirm(false)}
        onConfirm={run}
      />
    </Screen>
  );
}
