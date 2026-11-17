import { useMemo, useState } from 'react';
import { Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import type { SendJob } from '@harusi/api-client';
import {
  buildContributionSms,
  buildInviteSms,
  estimateSmsCostFor,
  senderNameFor,
} from '@harusi/api-client';
import type { CardKind } from '@harusi/schemas';
import { eventKindLabel, renderTemplate } from '@harusi/schemas';
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
  // which cards to send (ADR 041): invitation cards, or contribution cards, which go out first when money comes before guests
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
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(true);
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

  const defaultWhatsappTemplate = useMemo(() => {
    if (contribution) {
      return locale === 'sw'
        ? '{mtumaji} wanakuomba mchango kwa sherehe ya {wenyeji}. Changia hapa: {kiungo}'
        : '{sender} kindly requests your contribution for {hosts}. Pledge here: {link}';
    }
    return locale === 'sw'
      ? 'Habari {mgeni}! {wenyeji} wanakualika: {tarehe}, {ukumbi}. Fungua kadi yako: {kiungo}'
      : 'Hello {guest}! {hosts} invite you: {date}, {venue}. Open your card: {link}';
  }, [contribution, locale]);

  const activeWhatsappTemplate = customMessage ?? defaultWhatsappTemplate;

  const renderedWhatsappMessage = useMemo(() => {
    const e = ev.data;
    if (!e) return sample;
    const couple =
      e.partnerA && e.partnerB ? `${e.partnerA} & ${e.partnerB}` : e.title || 'Asha & Juma';
    const sampleVars: Record<string, string> = {
      guest: 'Asha Mwinyi',
      mgeni: 'Asha Mwinyi',
      hosts: couple,
      wenyeji: couple,
      date: formatDate(e.dateStart, locale),
      tarehe: formatDate(e.dateStart, locale),
      venue: e.venueName || (locale === 'sw' ? 'Ukumbi Rasmi' : 'Official Venue'),
      ukumbi: e.venueName || (locale === 'sw' ? 'Ukumbi Rasmi' : 'Official Venue'),
      link: 'https://kadisasa.com/s/KH-4821',
      kiungo: 'https://kadisasa.com/s/KH-4821',
      code: 'KH-4821',
      kadi: 'KH-4821',
      dress: e.dressCode || (locale === 'sw' ? 'Mavazi Rasmi' : 'Formal'),
      mavazi: e.dressCode || (locale === 'sw' ? 'Mavazi Rasmi' : 'Formal'),
      sender: senderNameFor(e, locale),
      mtumaji: senderNameFor(e, locale),
      phone: e.committeePhone || '',
      simu: e.committeePhone || '',
    };
    return renderTemplate(activeWhatsappTemplate, sampleVars);
  }, [ev.data, sample, activeWhatsappTemplate, locale]);
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
      {channel === 'whatsapp' || channel === 'auto' ? (
        <View
          style={{
            alignSelf: 'stretch',
            backgroundColor: '#ECE5DD',
            borderRadius: 16,
            padding: 12,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="whatsapp" size={16} color="#128C7E" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#075E54' }}>
                {locale === 'sw' ? 'Muonekano wa Kadi WhatsApp' : 'WhatsApp Card Preview'}
              </Text>
            </View>
            <Pressable onPress={() => setShowEditor((v) => !v)}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#075E54' }}>
                {showEditor
                  ? locale === 'sw'
                    ? 'Ficha Mhariri'
                    : 'Hide Editor'
                  : locale === 'sw'
                    ? 'Hariri Ujumbe'
                    : 'Edit Message'}
              </Text>
            </Pressable>
          </View>

          {/* Interactive Message Customizer with Attribute Chips */}
          {showEditor ? (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 10,
                gap: 8,
                borderWidth: 1,
                borderColor: '#CBD5E1',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>
                {locale === 'sw'
                  ? 'Gusa sifa kuingiza kwenye ujumbe:'
                  : 'Tap attribute chips to insert:'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(locale === 'sw'
                  ? [
                      { tag: '{mgeni}', label: 'Mgeni' },
                      { tag: '{wenyeji}', label: 'Wenyeji' },
                      { tag: '{tarehe}', label: 'Tarehe' },
                      { tag: '{ukumbi}', label: 'Ukumbi' },
                      { tag: '{kiungo}', label: 'Kiungo' },
                      { tag: '{kadi}', label: 'Msimbo' },
                      { tag: '{mavazi}', label: 'Mavazi' },
                    ]
                  : [
                      { tag: '{guest}', label: 'Guest' },
                      { tag: '{hosts}', label: 'Hosts' },
                      { tag: '{date}', label: 'Date' },
                      { tag: '{venue}', label: 'Venue' },
                      { tag: '{link}', label: 'Link' },
                      { tag: '{code}', label: 'Code' },
                      { tag: '{dress}', label: 'Dress' },
                    ]
                ).map((attr) => (
                  <Pressable
                    key={attr.tag}
                    onPress={() => {
                      const cur = activeWhatsappTemplate;
                      setCustomMessage(cur ? `${cur} ${attr.tag}` : attr.tag);
                    }}
                    style={{
                      backgroundColor: '#E0F2FE',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#BAE6FD',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369A1' }}>
                      + {attr.tag}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={activeWhatsappTemplate}
                onChangeText={setCustomMessage}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 8,
                  fontSize: 12,
                  color: '#0F172A',
                  minHeight: 56,
                }}
                placeholder={
                  locale === 'sw'
                    ? 'Andika ujumbe… Tumia {mgeni}, {kiungo} n.k.'
                    : 'Write message… Use {guest}, {link} etc.'
                }
              />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Pressable onPress={() => setCustomMessage(defaultWhatsappTemplate)}>
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                    {locale === 'sw' ? 'Rudisha Asili' : 'Reset Default'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderTopLeftRadius: 4,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            }}
          >
            <View
              style={{
                backgroundColor: ev.data?.palette?.primary || c.primary,
                paddingVertical: 14,
                paddingHorizontal: 12,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 1,
                  }}
                >
                  {contribution
                    ? locale === 'sw'
                      ? 'KADI YA MCHANGO'
                      : 'CONTRIBUTION CARD'
                    : locale === 'sw'
                      ? 'KADI MAALUM YA KUALIKWA'
                      : 'OFFICIAL INVITATION CARD'}
                </Text>
              </View>

              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: '800',
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                {ev.data
                  ? ev.data.partnerA && ev.data.partnerB
                    ? `${ev.data.partnerA} & ${ev.data.partnerB}`
                    : ev.data.title
                  : 'Harusi Yetu'}
              </Text>

              <Text style={{ color: '#D4AF37', fontSize: 12 }}>❖ ❖ ❖</Text>

              <Text
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: 12,
                  fontWeight: '500',
                  textAlign: 'center',
                }}
              >
                {ev.data?.dateStart ? formatDate(ev.data.dateStart, locale) : ''}
                {ev.data?.venueName ? ` · ${ev.data.venueName}` : ''}
              </Text>

              <View
                style={{
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 6,
                  marginTop: 2,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
                  {locale === 'sw' ? 'Kwa: Ndugu Mualikwa' : 'To: Honoured Guest'}
                </Text>
              </View>

              <View
                style={{
                  marginTop: 6,
                  backgroundColor: '#FFFFFF',
                  padding: 8,
                  borderRadius: 10,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 2,
                  width: 140,
                }}
              >
                <Icon name="qr" size={48} color="#1E293B" />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: '#0F172A',
                    letterSpacing: 1.5,
                    marginTop: 2,
                  }}
                >
                  KH-4821
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    color: '#64748B',
                    textAlign: 'center',
                    marginTop: 2,
                  }}
                >
                  {locale === 'sw' ? 'Onyesha mlangoni kwa uthibitisho' : 'Show at gate for entry'}
                </Text>
              </View>

              {/* RSVP Pills Mockup */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  width: '100%',
                  paddingHorizontal: 8,
                  marginTop: 4,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#059669',
                    borderRadius: 6,
                    paddingVertical: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                    {locale === 'sw' ? 'Ndio, Nitafika' : 'Yes, Attending'}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    borderWidth: 1.5,
                    borderColor: '#059669',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 6,
                    paddingVertical: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700' }}>
                    {locale === 'sw' ? 'Hapana, Sitafika' : 'No, Regrets'}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                backgroundColor: '#F8FAFC',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
                gap: 2,
              }}
            >
              <Text style={{ fontSize: 11, color: '#64748B' }}>kadisasa.com</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                {ev.data
                  ? ev.data.partnerA && ev.data.partnerB
                    ? `${ev.data.partnerA} & ${ev.data.partnerB}`
                    : ev.data.title
                  : ''}{' '}
                · {eventKindLabel(ev.data?.eventKind, locale as 'sw' | 'en')}
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B' }}>
                {locale === 'sw'
                  ? 'Fungua kadi yako rasmi yenye QR code mtandaoni'
                  : 'Open your official card with QR code online'}
              </Text>
            </View>

            <View style={{ padding: 12, gap: 6 }}>
              <Text style={{ fontSize: 14, color: '#1B1B1F', lineHeight: 20 }}>
                {renderedWhatsappMessage}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 11, color: '#64748B' }}>10:42</Text>
                <Icon name="check" size={14} color="#53BDEB" />
              </View>
            </View>

            {/* Quick Action Toolbar to Convert to Image & Send to WhatsApp */}
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                paddingHorizontal: 12,
                paddingBottom: 12,
                paddingTop: 4,
              }}
            >
              <Pressable
                onPress={() => {
                  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(
                    renderedWhatsappMessage,
                  )}`;
                  void Linking.openURL(url);
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#25D366',
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                }}
              >
                <Icon name="whatsapp" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  {locale === 'sw' ? 'Tuma Picha WhatsApp' : 'Send Image to WhatsApp'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const url = `https://kadisasa.com/api/card-image?code=KH-4821&couple=${encodeURIComponent(
                    ev.data
                      ? ev.data.partnerA && ev.data.partnerB
                        ? `${ev.data.partnerA} & ${ev.data.partnerB}`
                        : ev.data.title
                      : 'Kadi Sasa',
                  )}&download=1`;
                  void Linking.openURL(url);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#F1F5F9',
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Icon name="download" size={16} color="#0F172A" />
                <Text style={{ color: '#0F172A', fontWeight: '600', fontSize: 13 }}>
                  {locale === 'sw' ? 'Pakua Picha' : 'Download Image'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
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
      )}
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
