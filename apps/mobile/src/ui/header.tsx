import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useIsMutating } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale, useT } from '../lib/i18n';
import { useOnline } from '../lib/network';
import { useColors } from '../lib/theme';
import { Txt } from './kit';

/** Header (§17.3): event switcher, language chip and sync indicator. */
export function AppHeader({ title, onBack }: { title: string; onBack?: () => void }) {
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
  return (
    <SafeAreaView
      edges={['top']}
      style={{ backgroundColor: c.surface, borderBottomWidth: 1, borderColor: c.border }}
    >
      <View
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          gap: 8,
        }}
      >
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={onBack}
            style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}
          >
            <Txt size={24}>‹</Txt>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nav.switchEvent')}
          onPress={() => router.replace('/events')}
          style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
        >
          <Txt bold size={20} numberOfLines={1}>
            {title}
          </Txt>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.switchTo', {
            lang: t(`common.languageName.${locale === 'sw' ? 'en' : 'sw'}`),
          })}
          onPress={() => setLocale(locale === 'sw' ? 'en' : 'sw')}
          style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' }}
        >
          <Txt bold size={14} color={c.primary}>
            {locale === 'sw' ? 'SW | en' : 'sw | EN'}
          </Txt>
        </Pressable>
        <View accessibilityLabel={sync} style={{ minHeight: 48, justifyContent: 'center' }}>
          <Txt size={14} color={!online ? c.warning : c.muted}>
            {online ? (pending > 0 ? '⟳' : '✓') : '⚠'}
          </Txt>
        </View>
      </View>
    </SafeAreaView>
  );
}
