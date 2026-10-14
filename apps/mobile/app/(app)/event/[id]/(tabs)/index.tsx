import { router, useGlobalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useEvent } from '../../../../../src/lib/queries';
import { useT } from '../../../../../src/lib/i18n';
import { daysUntil } from '../../../../../src/lib/format';
import { useColors } from '../../../../../src/lib/theme';
import { Icon, type IconName } from '../../../../../src/ui/icons';
import {
  Button,
  Card,
  ErrorState,
  FunnelBar,
  Kpi,
  Screen,
  SectionTitle,
  Skeleton,
  Tile,
} from '../../../../../src/ui/kit';

export default function Overview() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const q = useEvent(id);
  if (q.isPending)
    return (
      <Screen>
        <Skeleton height={150} />
        <Skeleton height={110} />
        <Skeleton height={90} />
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
  const days = daysUntil(e.dateStart);
  const go = (path: string) => () => router.push(`/event/${id}/${path}`);

  // "Next step": the one thing to do now (§17.4)
  const next: { icon: IconName; text: string; label: string; go: () => void } =
    s.invited === 0
      ? {
          icon: 'import',
          text: t('overview.next.import'),
          label: t('overview.nextAction.import'),
          go: go('guests/import'),
        }
      : remaining > 0
        ? {
            icon: 'send',
            text: t('overview.next.send', { count: remaining }),
            label: t('overview.nextAction.send'),
            go: go('send'),
          }
        : s.failedMessages > 0
          ? {
              icon: 'warn',
              text: t('overview.next.failed', { count: s.failedMessages }),
              label: t('overview.nextAction.failed'),
              go: go('guests'),
            }
          : s.sent - s.confirmed - s.declined > 0
            ? {
                icon: 'bell',
                text: t('overview.next.remind', { count: s.sent - s.confirmed - s.declined }),
                label: t('overview.nextAction.remind'),
                go: go('send'),
              }
            : {
                icon: 'checkCircle',
                text: t('overview.next.done'),
                label: t('overview.nextAction.done'),
                go: go('guests'),
              };

  return (
    <Screen>
      {/* hero: how long to go, and how far the invitations have got (names and venue are in the header) */}
      <Card tone="brand" style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
          <Text style={{ color: c.onPrimary, fontSize: 56, fontWeight: '800', lineHeight: 60 }}>
            {Math.max(0, days)}
          </Text>
          <Text
            style={{
              color: c.onPrimary,
              fontSize: 18,
              fontWeight: '600',
              paddingBottom: 8,
              flexShrink: 1,
            }}
          >
            {days <= 0
              ? t('overview.countdown', { days: 0 })
              : t('events.daysLeft', { days })
                  .replace(/\d+\s*/, '')
                  .trim()}
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ color: c.onPrimary, fontSize: 14 }}>
            {t('mobile.sentProgress', { sent: s.sent, total: s.invited })}
          </Text>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.28)' }}>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                width: `${s.invited ? Math.max(3, (s.sent / s.invited) * 100) : 0}%`,
                backgroundColor: '#FFFFFF',
              }}
            />
          </View>
        </View>
      </Card>

      {/* the one thing to do next */}
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: c.primary + '1A',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={next.icon} size={22} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                letterSpacing: 0.6,
                color: c.muted,
                textTransform: 'uppercase',
              }}
            >
              {t('overview.nextStep')}
            </Text>
            <Text style={{ fontSize: 16, color: c.ink, marginTop: 2 }}>{next.text}</Text>
          </View>
        </View>
        <Button label={next.label} onPress={next.go} />
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Kpi icon="guests" label={t('overview.kpiInvited')} value={s.invited} />
        <Kpi icon="checkCircle" label={t('mobile.kpiComing')} value={s.confirmed} />
        <Kpi icon="gate" label={t('overview.kpiAttended')} value={s.attended} />
      </View>
      <Text style={{ fontSize: 13, color: c.muted, marginTop: -4 }}>
        {t('overview.kpiPeople', { count: s.headcountConfirmed })} ·{' '}
        {t('overview.funnel.confirmed')}
      </Text>

      <SectionTitle>{t('overview.funnelTitle')}</SectionTitle>
      <Card>
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

      {role === 'owner' ? (
        <>
          <SectionTitle>{t('nav.more')}</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Tile icon="import" label={t('guests.addImport')} onPress={go('guests/import')} />
            <Tile icon="card" label={t('nav.cards')} onPress={go('cards')} />
            <Tile icon="invite" label={t('nav.team')} onPress={go('members')} />
            <Tile icon="settings" label={t('nav.settings')} onPress={go('settings')} />
            <Tile icon="history" label={t('mobile.auditTitle')} onPress={go('audit')} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}
