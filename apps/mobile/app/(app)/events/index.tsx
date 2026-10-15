import { View } from 'react-native';
import { router } from 'expo-router';
import { useEvents } from '../../../src/lib/queries';
import { useSession } from '../../../src/lib/session';
import { useT, useLocale } from '../../../src/lib/i18n';
import { daysUntil, formatDate, initials } from '../../../src/lib/format';
import { useColors } from '../../../src/lib/theme';
import { AppHeader } from '../../../src/ui/header';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Pill,
  Row,
  Screen,
  Skeleton,
  Txt,
} from '../../../src/ui/kit';

export default function Events() {
  const t = useT();
  const c = useColors();
  const { locale } = useLocale();
  const { signOut } = useSession();
  const q = useEvents();
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={t('events.title')} />
      <Screen
        footer={<Button label={t('events.new')} onPress={() => router.push('/events/new')} />}
      >
        {q.isPending ? (
          <>
            <Skeleton />
            <Skeleton />
          </>
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : q.data.length === 0 ? (
          <EmptyState
            text={t('events.empty')}
            action={{ label: t('events.new'), onPress: () => router.push('/events/new') }}
          />
        ) : (
          q.data.map((e) => {
            const d = daysUntil(e.dateStart);
            return (
              <Card key={e.id}>
                <Row
                  onPress={() => router.push(`/event/${e.id}`)}
                  label={t('events.open', { name: e.coupleNames })}
                >
                  <Avatar text={initials(e.coupleNames)} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt bold size={20}>
                      {e.coupleNames}
                    </Txt>
                    <Txt size={14} color={c.muted}>
                      {formatDate(e.dateStart, locale)} · {e.venueName}
                    </Txt>
                    <Txt size={14} color={c.muted}>
                      {d >= 0
                        ? t('events.daysLeft', { days: d })
                        : t('events.daysAgo', { days: -d })}
                    </Txt>
                  </View>
                  <Pill
                    label={t(`events.statusPill.${e.status}`)}
                    tone={e.status === 'active' ? 'success' : 'neutral'}
                  />
                </Row>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Txt size={14}>
                    {t('events.statInvited')}: {e.stats.invited}
                  </Txt>
                  <Txt size={14}>
                    {t('events.statConfirmed')}: {e.stats.confirmed}
                  </Txt>
                </View>
              </Card>
            );
          })
        )}
        <Button
          variant="ghost"
          label={t('nav.signOut')}
          onPress={async () => {
            await signOut();
            router.replace('/welcome');
          }}
        />
      </Screen>
    </View>
  );
}
