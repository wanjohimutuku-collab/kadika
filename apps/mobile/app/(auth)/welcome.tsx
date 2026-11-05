import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useLocale, useT } from '../../src/lib/i18n';
import { spacing, useColors } from '../../src/lib/theme';
import { Icon, type IconName } from '../../src/ui/icons';
import { Button, Screen, Txt } from '../../src/ui/kit';
import { QrCode } from '../../src/ui/qr';

/** Not a card token: a demo string, so scanning the picture opens nothing. */
const DEMO_QR = 'KADISASA-DEMO-KH-4826';

const POINTS: { key: 'cards' | 'pledges' | 'gate'; icon: IconName }[] = [
  { key: 'cards', icon: 'whatsapp' },
  { key: 'pledges', icon: 'pledges' },
  { key: 'gate', icon: 'gate' },
];

/**
 * First screen of the organizer and gate app (2026-11 redesign, matching the website): a sample guest card
 * in a nested "bezel" frame, the three things the app does, then the actions in the thumb zone.
 */
export default function Welcome() {
  const t = useT();
  const c = useColors();
  const { locale, setLocale } = useLocale();
  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button label={t('auth.sendCode')} icon="phone" onPress={() => router.push('/phone')} />
          {/* Gate agents have no account: they join with the link code and PIN from the hosts. */}
          <Button
            variant="secondary"
            icon="gate"
            label={t('gateApp.welcomeGate')}
            onPress={() => router.push('/gate-join')}
          />
        </View>
      }
    >
      <View style={{ paddingTop: spacing.xl, gap: spacing.lg }}>
        <View
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
          <Text
            style={{
              color: c.primary,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {t('appWelcome.eyebrow')}
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Txt size={36} bold color={c.primary}>
            {t('common.appName')}
          </Txt>
          <Txt size={20}>{t('common.tagline')}</Txt>
        </View>

        {/* Sample card: outer tray + inner card, concentric corners. */}
        <View
          accessible
          accessibilityLabel={t('appWelcome.sample')}
          style={{
            borderRadius: 28,
            padding: 6,
            backgroundColor: c.primary + '12',
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <View
            style={{
              borderRadius: 22,
              backgroundColor: c.surface,
              padding: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.lg,
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{ color: c.primary, fontSize: 24, fontStyle: 'italic', fontWeight: '700' }}
              >
                Asha & Juma
              </Text>
              <Txt size={14} color={c.muted}>
                14 Des 2026 · Kibaha
              </Txt>
              <Text
                style={{
                  marginTop: spacing.sm,
                  color: c.ink,
                  fontSize: 20,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                }}
              >
                KH-4826
              </Text>
            </View>
            <View style={{ padding: 4, backgroundColor: '#FFFFFF', borderRadius: 8 }}>
              <QrCode value={DEMO_QR} size={84} label={t('appWelcome.sample')} />
            </View>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          {POINTS.map((p) => (
            <View key={p.key} style={{ flexDirection: 'row', gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.primary + '1A',
                }}
              >
                <Icon name={p.icon} size={22} color={c.primary} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt bold>{t(`appWelcome.points.${p.key}.title`)}</Txt>
                <Txt size={14} color={c.muted}>
                  {t(`appWelcome.points.${p.key}.body`)}
                </Txt>
              </View>
            </View>
          ))}
        </View>

        <Txt size={14} color={c.muted}>
          {t('auth.trust')}
        </Txt>
        <Button
          variant="ghost"
          label={t('common.switchTo', {
            lang: t(`common.languageName.${locale === 'sw' ? 'en' : 'sw'}`),
          })}
          onPress={() => setLocale(locale === 'sw' ? 'en' : 'sw')}
        />
      </View>
    </Screen>
  );
}
