import { useMemo, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import type { SendJob } from '@harusi/api-client';
import {
  buildContributionSms,
  buildInviteSms,
  estimateSmsCostFor,
  senderNameFor,
} from '@harusi/api-client';
import type { CardKind } from '@harusi/schemas';
import { useEvent, useGuests, useRetryFailed, useSend } from '../../../../../src/lib/queries';
import { useLocale, useT } from '../../../../../src/lib/i18n';
import { formatDate, formatMoney } from '../../../../../src/lib/format';
import { useEventLocale } from '../../../../../src/lib/country';
import { useOnline } from '../../../../../src/lib/network';
import { useColors } from '../../../../../src/lib/theme';
import { Icon } from '../../../../../src/ui/icons';
import {
  Banner,
  Button,
  Card,
  ConfirmSheet,
  Kpi,
  Screen,
  SectionTitle,
  Tile,
  Txt,
} from '../../../../../src/ui/kit';

type Channel = 'auto' | 'whatsapp' | 'sms';

export default function Send() {
  const { id, card } = useGlobalSearchParams<{ id: string; card?: string }>();
  const { currency } = useEventLocale(id);
  const t = useT();
  const c = useColors();
  const { locale } = useLocale();
  const online = useOnline();
  const ev = useEvent(id);
  // which cards to send (ADR 040): invitation cards, or contribution cards, which go out first when money comes before guests
  const [cardKind, setCardKind] = useState<CardKind>(
    card === 'contribution' ? 'contribution' : 'invitation',
  );
  const contribution = cardKind === 'contribution';
  const guests = useGuests(id, { filter: 'unsent', cardKind });
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
    if (contribution)
      return buildContributionSms({
        locale,
        partnerA: e.partnerA,
        partnerB: e.partnerB,
        kind: e.eventKind,
        // the sender in the language of the screen, as the API picks it for each guest
        sender: senderNameFor(e, locale),
        shortLink: 'harusi.example/s/…',
      });
    return buildInviteSms({
      locale,
      partnerA: e.partnerA,
      partnerB: e.partnerB,
      kind: e.eventKind,
      dateText: formatDate(e.dateStart, locale),
      shortLink: 'harusi.example/s/…',
      code: 'KH-4821',
    });
  }, [ev.data, locale, contribution]);
  const contributionGuests = ev.data?.stats.contributionGuests ?? 0;
  const contributionsOff = contribution && ev.data?.pledgesEnabled === false;
  // Who gets which channel: smartphone guests by WhatsApp, the rest by SMS, unless one is forced.
  const waCount =
    channel === 'sms'
      ? 0
      : withPhone.filter((g) => g.hasSmartphone && g.inviteChannelPref !== 'sms').length;
  const smsCount = withPhone.length - waCount;
  const cost = estimateSmsCostFor(sample, smsCount, currency);

  const run = async () => {
    try {
      const j = await send.mutateAsync({
        audience: { kind: 'unsent' },
        channel,
        whatsappFallbackToSms: fallback,
        scheduleAt: null,
        kind: 'invite',
        cardKind,
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
              icon="sync"
              label={t('send.retryFailed')}
              loading={retry.isPending}
              onPress={async () => setJob(await retry.mutateAsync(job.id))}
            />
          ) : (
            <Button label={t('send.newSend')} onPress={() => setJob(null)} />
          )
        }
      >
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: (job.counts.failed > 0 ? c.warning : c.success) + '1F',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={job.counts.failed > 0 ? 'warn' : 'checkCircle'}
              size={36}
              color={job.counts.failed > 0 ? c.warning : c.success}
            />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: c.ink }}>
            {t('send.progressDone')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Kpi icon="send" label={t('send.counters.sent')} value={job.counts.sent} />
          <Kpi icon="warn" label={t('send.counters.failed')} value={job.counts.failed} />
        </View>
        {job.counts.failed > 0 ? (
          <Banner
            tone="warning"
            text={t('states.partialFailure', { failed: job.counts.failed, total: job.total })}
          />
        ) : null}
        {job.failures.map((f) => (
          <View key={f.guestId} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Icon name="close" size={16} color={c.danger} />
            <Txt size={14} color={c.danger}>
              {f.guestName}: {f.error}
            </Txt>
          </View>
        ))}
      </Screen>
    );

  return (
    <Screen
      footer={
        <Button
          icon="send"
          label={`${t('send.sendNow')} (${targets.length})`}
          disabled={targets.length === 0 || !online || contributionsOff}
          loading={send.isPending}
          onPress={() => setConfirm(true)}
        />
      }
    >
      {!online ? <Banner tone="warning" text={t('send.offline')} /> : null}

      <SectionTitle>{t('send.cardType')}</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Tile
          icon="invite"
          label={t('send.cardTypes.invitation')}
          hint={String(ev.data?.stats.invited ?? 0)}
          selected={!contribution}
          onPress={() => setCardKind('invitation')}
        />
        <Tile
          icon="pledges"
          label={t('send.cardTypes.contribution')}
          hint={String(contributionGuests)}
          selected={contribution}
          onPress={() => setCardKind('contribution')}
        />
      </View>
      {contribution ? (
        <>
          <Txt size={14} color={c.muted}>
            {t('send.contributionHelp')}
          </Txt>
          {contributionsOff ? (
            <>
              <Banner tone="warning" text={t('send.contributionsOff')} />
              <Button
                variant="secondary"
                label={t('send.openSettings')}
                onPress={() => router.push(`/event/${id}/settings`)}
              />
            </>
          ) : null}
          {contributionGuests === 0 ? (
            <>
              <Banner tone="info" text={t('send.noContributionGuests')} />
              <Button
                variant="secondary"
                label={t('send.addGuestLink')}
                onPress={() => router.push(`/event/${id}/guests/new?card=contribution`)}
              />
              <Button
                variant="secondary"
                label={t('send.importLink')}
                onPress={() => router.push(`/event/${id}/guests/import?card=contribution`)}
              />
            </>
          ) : null}
          <Txt size={14} color={c.muted}>
            {t('send.contributionFollowUp')}
          </Txt>
        </>
      ) : null}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: c.primary + '1A',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="guests" size={26} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: c.ink }}>{targets.length}</Text>
            <Text style={{ fontSize: 14, color: c.muted }}>{t('send.audiences.unsent')}</Text>
          </View>
        </View>
        {targets.length - withPhone.length > 0 ? (
          <Txt size={13} color={c.muted}>
            {t('send.withoutPhone', { count: targets.length - withPhone.length })}
          </Txt>
        ) : null}
      </Card>

      <SectionTitle>{t('send.channel')}</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Tile
          icon="send"
          label={t('channel.auto')}
          hint={`WhatsApp ${waCount} · SMS ${smsCount}`}
          selected={channel === 'auto'}
          onPress={() => setChannel('auto')}
        />
        <Tile
          icon="whatsapp"
          label={t('channel.whatsapp')}
          hint={String(withPhone.length)}
          selected={channel === 'whatsapp'}
          onPress={() => setChannel('whatsapp')}
        />
        <Tile
          icon="sms"
          label={t('channel.sms')}
          hint={`${withPhone.length} · ${formatMoney(estimateSmsCostFor(sample, withPhone.length, currency).cost, currency)}`}
          selected={channel === 'sms'}
          onPress={() => setChannel('sms')}
        />
      </View>
      {channel === 'auto' ? (
        <Txt size={13} color={c.muted}>
          {t('send.channelAutoHelp')}
        </Txt>
      ) : null}

      <SectionTitle>{t('send.preview')}</SectionTitle>
      <View
        style={{
          alignSelf: 'stretch',
          backgroundColor: c.primary + '14',
          borderRadius: 16,
          borderTopLeftRadius: 4,
          padding: 14,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 15, color: c.ink, lineHeight: 22 }}>{sample}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="sms" size={14} color={c.muted} />
        <Txt size={13} color={c.muted}>
          {t('send.smsCost', { cost: formatMoney(cost.cost, currency) })}
        </Txt>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>
              {t('send.fallback')}
            </Text>
            <Text style={{ fontSize: 13, color: c.muted }}>
              {t('send.fallbackHelp', { hours: 6 })}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t('send.fallback')}
            value={fallback}
            onValueChange={setFallback}
            trackColor={{ true: c.primary, false: c.border }}
          />
        </View>
      </Card>
      {send.isError ? <Banner tone="danger" text={t('states.errorBody')} /> : null}
      <ConfirmSheet
        open={confirm}
        title={
          contribution
            ? t('send.confirmTitleContribution', { count: targets.length })
            : t('send.confirmTitle', { count: targets.length })
        }
        body={t('send.confirmBody', {
          whatsapp: waCount,
          sms: smsCount,
          print: targets.length - withPhone.length,
          cost: formatMoney(cost.cost, currency),
        })}
        confirmLabel={t('send.sendNow')}
        onClose={() => setConfirm(false)}
        onConfirm={run}
      />
    </Screen>
  );
}
