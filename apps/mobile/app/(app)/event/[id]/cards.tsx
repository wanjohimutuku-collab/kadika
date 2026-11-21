import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router, useGlobalSearchParams } from 'expo-router';
import { cardTemplateOf, pick, type CardTemplate } from '@harusi/schemas';
import { themeIds, themes, type ThemeId } from '@harusi/ui-tokens';
import { WEB_URL, getRepository } from '../../../../src/lib/repo';
import { useEvent, useUpdateEvent } from '../../../../src/lib/queries';
import { useLocale, useT } from '../../../../src/lib/i18n';
import { radius, spacing, useColors } from '../../../../src/lib/theme';
import { AppHeader } from '../../../../src/ui/header';
import { Icon } from '../../../../src/ui/icons';
import { Banner, Button, Field, Screen, SectionTitle, Skeleton, Txt } from '../../../../src/ui/kit';

type Layout = { format: 'A6' | 'A5'; layout: 'single' | 'a4-4up' | 'test-sheet'; label: string };

const blobToBase64 = (b: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

const TEMPLATE_INFO: { id: CardTemplate; labelKey: string; hintKey: string }[] = [
  { id: 'classic', labelKey: 'cards.templateClassic', hintKey: 'cards.templateClassicHint' },
  { id: 'modern', labelKey: 'cards.templateModern', hintKey: 'cards.templateModernHint' },
  { id: 'script', labelKey: 'cards.templateScript', hintKey: 'cards.templateScriptHint' },
  { id: 'botanical', labelKey: 'cards.templateBotanical', hintKey: 'cards.templateBotanicalHint' },
  {
    id: 'floral-corner',
    labelKey: 'cards.templateFloralCorner',
    hintKey: 'cards.templateFloralCornerHint',
  },
  {
    id: 'wildflower-arch',
    labelKey: 'cards.templateWildflowerArch',
    hintKey: 'cards.templateWildflowerArchHint',
  },
  {
    id: 'mandala-arch',
    labelKey: 'cards.templateMandalaArch',
    hintKey: 'cards.templateMandalaArchHint',
  },
  {
    id: 'marigold-garland',
    labelKey: 'cards.templateMarigoldGarland',
    hintKey: 'cards.templateMarigoldGarlandHint',
  },
  { id: 'custom', labelKey: 'cards.templateCustom', hintKey: 'cards.templateCustomHint' },
];

export default function Cards() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const { locale } = useLocale();
  const eventQuery = useEvent(id);
  const updateEvent = useUpdateEvent(id);

  const [template, setTemplate] = useState<CardTemplate>('classic');
  const [themeId, setThemeId] = useState<ThemeId>('emerald-gold');
  const [dTitle, setDTitle] = useState('');
  const [dMessage, setDMessage] = useState('');
  const [dFooter, setDFooter] = useState('');
  const [dShowQr, setDShowQr] = useState(true);

  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const ev = eventQuery.data;

  useEffect(() => {
    if (!ev) return;
    setThemeId(ev.themeId || 'emerald-gold');
    setTemplate(cardTemplateOf(ev.cardContent));
    const d = ev.cardContent?.design;
    setDTitle(pick(d?.title, locale) ?? '');
    setDMessage(pick(d?.message, locale) ?? '');
    setDFooter(pick(d?.footer, locale) ?? '');
    setDShowQr(d?.showQr !== false);
  }, [ev, locale]);

  const saveDesign = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateEvent.mutateAsync({
        themeId,
        cardContent: {
          ...(ev?.cardContent ?? {}),
          design: {
            ...(ev?.cardContent?.design ?? {}),
            template,
            title: { ...ev?.cardContent?.design?.title, [locale]: dTitle.trim() },
            message: { ...ev?.cardContent?.design?.message, [locale]: dMessage.trim() },
            footer: { ...ev?.cardContent?.design?.footer, [locale]: dFooter.trim() },
            showQr: dShowQr,
          },
        },
      });
      setMsg({ tone: 'success', text: t('cards.saved') });
    } catch {
      setMsg({ tone: 'danger', text: t('states.errorBody') });
    } finally {
      setSaving(false);
    }
  };

  const make = async (o: Layout) => {
    setBusy(o.label);
    setMsg(null);
    try {
      const blob = await getRepository().requestCardsPdf(id, {
        format: o.format,
        layout: o.layout,
      });
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'harusi-cards.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } else {
        const uri = `${FileSystem.cacheDirectory}harusi-${o.layout}-${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(uri, await blobToBase64(blob), {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync())
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
      setMsg({ tone: 'success', text: t('mobile.cardsDone') });
    } catch {
      setMsg({ tone: 'danger', text: t('states.errorBody') });
    } finally {
      setBusy(null);
    }
  };

  const opts: Layout[] = [
    { format: 'A6', layout: 'test-sheet', label: t('mobile.cardsTest') },
    { format: 'A6', layout: 'single', label: t('mobile.cardsA6') },
    { format: 'A5', layout: 'single', label: t('mobile.cardsA5') },
    { format: 'A6', layout: 'a4-4up', label: t('mobile.cardsA4') },
  ];

  const previewParams = new URLSearchParams({
    preview: '1',
    template,
    theme: themeId,
    partnerA: ev?.partnerA ?? 'Asha',
    ...(ev?.partnerB ? { partnerB: ev.partnerB } : {}),
    eventKind: ev?.eventKind ?? 'Harusi',
    date: ev?.dateStart ?? '',
    venue: ev?.venueName ?? '',
    ...(dTitle ? { title: dTitle } : {}),
    ...(dMessage ? { message: dMessage } : {}),
    ...(dFooter ? { footer: dFooter } : {}),
    ...(dShowQr ? {} : { qr: '0' }),
    seats: '2',
    locale,
  });

  const previewUrl = `${WEB_URL}/api/card-image?${previewParams.toString()}`;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={t('cards.title')} onBack={() => router.back()} />
      <Screen>
        {msg ? <Banner tone={msg.tone} text={msg.text} /> : null}

        {/* Section 1: Live Card Preview */}
        <SectionTitle>{t('cards.design')}</SectionTitle>
        <Txt size={14} color={c.muted}>
          {t('cards.designHint')}
        </Txt>

        <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
          <View
            style={{
              width: 240,
              height: 352,
              borderRadius: radius.card,
              overflow: 'hidden',
              borderWidth: 3,
              borderColor: c.ink,
              backgroundColor: c.surface,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            {eventQuery.isLoading ? (
              <Skeleton height={352} />
            ) : (
              <Image
                source={{ uri: previewUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            )}
          </View>
        </View>

        {/* Section 2: Template Selection */}
        <SectionTitle>
          {locale === 'sw' ? 'Chagua Kiolezo cha Kadi' : 'Select Card Template'}
        </SectionTitle>
        <View style={{ gap: spacing.sm }}>
          {TEMPLATE_INFO.map((tpl) => {
            const isSelected = template === tpl.id;
            return (
              <Pressable
                key={tpl.id}
                onPress={() => setTemplate(tpl.id)}
                style={{
                  padding: spacing.md,
                  borderRadius: radius.card,
                  borderWidth: 2,
                  borderColor: isSelected ? c.primary : c.border,
                  backgroundColor: isSelected ? `${c.primary}12` : c.surface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <Txt bold size={15} color={isSelected ? c.primary : c.ink}>
                    {t(tpl.labelKey)}
                  </Txt>
                  <Txt size={12} color={c.muted}>
                    {t(tpl.hintKey)}
                  </Txt>
                </View>
                {isSelected ? (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: c.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="check" size={14} color={c.onPrimary} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Section 3: Themes / Colors */}
        <SectionTitle>{t('cards.themes')}</SectionTitle>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {themeIds.map((tid) => {
            const th = themes[tid];
            const isSelected = themeId === tid;
            return (
              <Pressable
                key={tid}
                onPress={() => setThemeId(tid)}
                style={{
                  padding: spacing.sm,
                  borderRadius: radius.card,
                  borderWidth: 2,
                  borderColor: isSelected ? c.primary : c.border,
                  backgroundColor: c.surface,
                  alignItems: 'center',
                  minWidth: 100,
                  gap: 4,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: th.primary,
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.1)',
                  }}
                />
                <Txt size={12} bold={isSelected} color={isSelected ? c.primary : c.ink}>
                  {tid.replace('-', ' ')}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Section 4: Card Text Customization */}
        <SectionTitle>{locale === 'sw' ? 'Maandishi ya Kadi' : 'Card Custom Text'}</SectionTitle>
        <Field
          label={t('cards.designTitle')}
          hint={t('cards.designTitleHint')}
          value={dTitle}
          onChangeText={setDTitle}
        />
        <Field
          label={t('cards.designMessage')}
          hint={t('cards.designMessageHint')}
          value={dMessage}
          onChangeText={setDMessage}
        />
        <Field
          label={t('cards.designFooter')}
          hint={t('cards.designFooterHint')}
          value={dFooter}
          onChangeText={setDFooter}
        />

        {/* QR Code Toggle */}
        <Pressable
          onPress={() => setDShowQr(!dShowQr)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.sm,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: dShowQr ? c.primary : c.border,
              backgroundColor: dShowQr ? c.primary : c.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {dShowQr ? <Icon name="check" size={14} color={c.onPrimary} /> : null}
          </View>
          <Txt size={14} color={c.ink}>
            {t('cards.designShowQr')}
          </Txt>
        </Pressable>

        {/* Save Button */}
        <Button
          label={t('common.save')}
          loading={saving}
          disabled={saving || eventQuery.isLoading}
          onPress={saveDesign}
        />

        {/* Section 5: Printable Cards PDF */}
        <SectionTitle>{t('mobile.cardsTitle')}</SectionTitle>
        <Txt size={14} color={c.muted}>
          {t('mobile.cardsHelp')}
        </Txt>
        {opts.map((o, i) => (
          <Button
            key={o.label}
            variant={i === 0 ? 'secondary' : 'secondary'}
            label={o.label}
            loading={busy === o.label}
            disabled={!!busy}
            onPress={() => make(o)}
          />
        ))}
      </Screen>
    </View>
  );
}
