import { router } from 'expo-router';
import { View } from 'react-native';
import { useLocale, useT } from '../../src/lib/i18n';
import { useColors } from '../../src/lib/theme';
import { Button, Screen, Txt } from '../../src/ui/kit';

export default function Welcome() {
  const t = useT();
  const c = useColors();
  const { locale, setLocale } = useLocale();
  return (
    <Screen footer={<Button label={t('auth.sendCode')} onPress={() => router.push('/phone')} />}>
      <View style={{ paddingTop: 64, gap: 16 }}>
        <Txt size={36} bold color={c.primary}>
          {t('common.appName')}
        </Txt>
        <Txt size={20}>{t('common.tagline')}</Txt>
        <Txt color={c.muted}>{t('auth.trust')}</Txt>
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
