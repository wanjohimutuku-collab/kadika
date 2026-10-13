import { t } from '@harusi/i18n';
import { lightColors as colors } from '@harusi/ui-tokens';

export default function Home() {
  return (
    <main style={{ padding: 24, color: colors.ink, fontFamily: 'system-ui, sans-serif' }}>
      <h1>{t('app.name')}</h1>
      <p>{t('invite.heading')}</p>
    </main>
  );
}
