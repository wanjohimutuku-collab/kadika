import { Pressable, Text, View } from 'react-native';
import { useIsMutating } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale, useT } from '../lib/i18n';
import { useOnline } from '../lib/network';
import { useColors, useIsDark } from '../lib/theme';
import { Icon } from './icons';

/**
 * Header (§17.3): where you are on the left, and two quiet controls on the right: a pill-shaped
 * language switch (matching the web header) and a compact sync status pill.
 */
export function AppHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const c = useColors();
  const dark = useIsDark();
  const t = useT();
  const { locale, setLocale } = useLocale();
  const online = useOnline();
  const pending = useIsMutating();
  const sync = !online
    ? t('states.offline')
    : pending > 0
      ? t('states.syncPending', { n: pending })
      : t('states.synced');
  const syncColor = !online ? c.warning : pending > 0 ? c.info : c.success;
  const other = locale === 'sw' ? 'en' : 'sw';

  return (
    <SafeAreaView
      edges={['top']}
      style={{
        backgroundColor: c.surface,
        borderBottomWidth: 1,
        borderColor: c.border,
        shadowColor: '#0A3F35',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: dark ? 0 : 0.05,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      {/* Subtle top kitenge-gold accent thread */}
      <View style={{ height: 2, backgroundColor: c.gold, opacity: 0.7 }} />
      <View
        style={{
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          gap: 6,
        }}
      >
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={onBack}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: pressed ? c.primarySoft : c.bg,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="next" size={22} color={c.ink} />
            </View>
          </Pressable>
        ) : null}
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: c.deepEmerald,
            borderWidth: 1.5,
            borderColor: c.gold,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: onBack ? 2 : 6,
          }}
        >
          <Icon name="gate" size={18} color={c.gold} />
        </View>
        <View style={{ flex: 1, minHeight: 48, justifyContent: 'center', paddingLeft: 4 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 10.5,
              fontWeight: '800',
              letterSpacing: 0.8,
              color: c.primary,
              textTransform: 'uppercase',
            }}
          >
            {`${t('common.appName')} · ${t('gateApp.gateName')}`}
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontSize: 18, fontWeight: '800', letterSpacing: -0.3, color: c.ink }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={{ fontSize: 12.5, color: c.muted, marginTop: 1 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Pill language switcher matching web header */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.switchTo', { lang: t(`common.languageName.${other}`) })}
          onPress={() => setLocale(other)}
          style={({ pressed }) => ({
            minHeight: 36,
            minWidth: 56,
            flexDirection: 'row',
            gap: 4,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: pressed ? c.primarySoft : c.bg,
            paddingHorizontal: 10,
          })}
        >
          <Icon name="language" size={14} color={c.primary} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: c.primary }}>
            {locale.toUpperCase()}
          </Text>
        </Pressable>

        {/* Compact sync status pill */}
        <View
          accessible
          accessibilityLabel={sync}
          style={{
            height: 36,
            width: 36,
            borderRadius: 18,
            backgroundColor: syncColor + '18',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            name={!online ? 'offline' : pending > 0 ? 'sync' : 'checkCircle'}
            size={18}
            color={syncColor}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
