import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useIsMutating } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale, useT } from '../lib/i18n';
import { useOnline } from '../lib/network';
import { useColors } from '../lib/theme';
import { Icon } from './icons';

/**
 * Header (§17.3): where you are on the left, and two quiet controls on the right: the language
 * (a pill showing the current one, one tap to switch) and the sync state (an icon plus a word for
 * screen readers). The title is the wedding's names; the optional subtitle carries date and venue.
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
      style={{ backgroundColor: c.surface, borderBottomWidth: 1, borderColor: c.border }}
    >
      <View
        style={{
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          gap: 4,
        }}
      >
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={onBack}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="next" size={26} color={c.ink} />
            </View>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nav.switchEvent')}
          onPress={() => router.replace('/events')}
          style={{ flex: 1, minHeight: 48, justifyContent: 'center', paddingLeft: onBack ? 0 : 8 }}
        >
          <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: '800', color: c.ink }}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={{ fontSize: 13, color: c.muted }}>
              {subtitle}
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.switchTo', { lang: t(`common.languageName.${other}`) })}
          onPress={() => setLocale(other)}
          style={{
            minHeight: 36,
            minWidth: 56,
            flexDirection: 'row',
            gap: 4,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.border,
            paddingHorizontal: 10,
          }}
        >
          <Icon name="language" size={15} color={c.primary} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: c.primary }}>
            {locale.toUpperCase()}
          </Text>
        </Pressable>
        <View
          accessible
          accessibilityLabel={sync}
          style={{ width: 40, height: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon
            name={!online ? 'offline' : pending > 0 ? 'sync' : 'checkCircle'}
            size={20}
            color={syncColor}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
