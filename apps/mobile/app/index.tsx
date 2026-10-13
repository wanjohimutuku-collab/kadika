import { Text, View } from 'react-native';
import { t } from '@harusi/i18n';
import { lightColors as colors } from '@harusi/ui-tokens';

export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, color: colors.primary }}>{t('app.name')}</Text>
    </View>
  );
}
