import { router, useGlobalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useEvent } from '../../../../../src/lib/queries';
import { useLocale, useT } from '../../../../../src/lib/i18n';
import { daysUntil, formatDate } from '../../../../../src/lib/format';
import { useColors } from '../../../../../src/lib/theme';
import {
  Button,
  Card,
  ErrorState,
  FunnelBar,
  Kpi,
  Pill,
  Screen,
  Skeleton,
  Txt,
} from '../../../../../src/ui/kit';

export default function Overview() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const { locale } = useLocale();
  const q = useEvent(id);
  if (q.isPending)
    return (
      <Screen>
        <Skeleton height={80} />
        <Skeleton height={120} />
      </Screen>
    );
  if (q.isError)
    return (
      <Screen>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  const e = q.data;
  const s = e.stats;
  const remaining = s.invited - s.sent;
  const role = (e as { myRole?: string }).myRole ?? 'owner';

  // "Next step" card (§17.4): the one thing to do now.
  const next =
    s.invited === 0
      ? {
          text: t('overview.next.import'),
          label: t('overview.nextAction.import'),
          go: () => router.push(`/event/${id}/guests/import`),
        }
      : remaining > 0
        ? {
            text: t('overview.next.send', { count: remaining }),
            label: t('overview.nextAction.send'),
            go: () => router.push(`/event/${id}/send`),
          }
        : s.failedMessages > 0
          ? {
              text: t('overview.next.failed', { count: s.failedMessages }),
              label: t('overview.nextAction.failed'),
              go: () => router.push(`/event/${id}/guests`),
            }
          : s.sent - s.confirmed - s.declined > 0
            ? {
                text: t('overview.next.remind', { count: s.sent - s.confirmed - s.declined }),
                label: t('overview.nextAction.remind'),
                go: () => router.push(`/event/${id}/send`),
              }
            : {
                text: t('overview.next.done'),
                label: t('overview.nextAction.done'),
                go: () => router.push(`/event/${id}/guests`),
              };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Txt color={c.muted}>
          {formatDate(e.dateStart, locale)} · {e.venueName}
        </Txt>
        <Pill
          label={t('overview.countdown', { days: Math.max(0, daysUntil(e.dateStart)) })}
          tone="info"
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Kpi label={t('overview.kpiInvited')} value={s.invited} />
        <Kpi label={t('overview.kpiConfirmed')} value={s.confirmed} />
        <Kpi label={t('overview.kpiAttended')} value={s.attended} />
      </View>
      <Txt size={14} color={c.muted}>
        {t('overview.kpiPeople', { count: s.headcountConfirmed })}
      </Txt>
      <Card>
        <Txt bold size={20}>
          {t('overview.funnelTitle')}
        </Txt>
        <FunnelBar
          steps={[
            { label: t('overview.funnel.created'), value: s.invited },
            { label: t('overview.funnel.sent'), value: s.sent },
            { label: t('overview.funnel.delivered'), value: s.delivered },
            { label: t('overview.funnel.opened'), value: s.opened },
            { label: t('overview.funnel.confirmed'), value: s.confirmed },
            { label: t('overview.funnel.checked_in'), value: s.attended },
          ]}
        />
      </Card>
      <Card>
        <Txt bold size={20}>
          {t('overview.nextStep')}
        </Txt>
        <Txt>{next.text}</Txt>
        <Button label={next.label} onPress={next.go} />
      </Card>
      {role === 'owner' ? (
        <>
          <Button
            variant="secondary"
            label={t('nav.cards')}
            onPress={() => router.push(`/event/${id}/cards`)}
          />
          <Button
            variant="secondary"
            label={t('nav.team')}
            onPress={() => router.push(`/event/${id}/members`)}
          />
          <Button
            variant="secondary"
            label={t('nav.settings')}
            onPress={() => router.push(`/event/${id}/settings`)}
          />
          <Button
            variant="secondary"
            label={t('mobile.auditTitle')}
            onPress={() => router.push(`/event/${id}/audit`)}
          />
        </>
      ) : null}
    </Screen>
  );
}
