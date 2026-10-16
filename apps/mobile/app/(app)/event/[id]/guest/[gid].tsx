import { useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useGlobalSearchParams } from 'expo-router';
import { formatPhone } from '@harusi/schemas/phone';
import {
  useDeleteGuest,
  useGuest,
  useReissue,
  useUpdateGuest,
} from '../../../../../src/lib/queries';
import { useT } from '../../../../../src/lib/i18n';
import { useEventLocale } from '../../../../../src/lib/country';
import { statusKey } from '../../../../../src/lib/format';
import { useColors } from '../../../../../src/lib/theme';
import { AppHeader } from '../../../../../src/ui/header';
import {
  Banner,
  Button,
  Card,
  ConfirmSheet,
  ErrorState,
  Pill,
  Screen,
  Skeleton,
  Txt,
} from '../../../../../src/ui/kit';

const STEPS = ['created', 'sent', 'delivered', 'opened', 'confirmed', 'checked_in'] as const;
const ORDER: Record<string, number> = {
  created: 0,
  queued: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  confirmed: 4,
  declined: 4,
  checked_in: 5,
};

export default function GuestDetail() {
  const { id, gid } = useGlobalSearchParams<{ id: string; gid: string }>();
  const t = useT();
  const c = useColors();
  const q = useGuest(gid);
  const { country } = useEventLocale(id);
  const reissue = useReissue(id);
  const del = useDeleteGuest(id);
  const update = useUpdateGuest(id);
  const [confirm, setConfirm] = useState<'reissue' | 'delete' | 'cardKind' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const g = q.data;
  const reached = g ? (ORDER[g.status] ?? 0) : 0;
  // a contribution card has no reply and no gate, so its story ends at "opened"
  const contribution = g?.cardKind === 'contribution';
  const steps = contribution ? STEPS.filter((s) => s !== 'confirmed' && s !== 'checked_in') : STEPS;
  const nextKind = contribution ? 'invitation' : 'contribution';
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={g?.displayName ?? t('common.loading')} onBack={() => router.back()} />
      <Screen>
        {q.isPending ? (
          <Skeleton height={160} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <>
            {msg ? <Banner tone="success" text={msg} /> : null}
            <Card>
              <Txt size={14} color={c.muted}>
                {t('guestDetail.code')}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Txt size={28} bold>
                  {g!.shortCode}
                </Txt>
                <Button
                  variant="secondary"
                  label={t('common.copy')}
                  onPress={async () => {
                    await Clipboard.setStringAsync(g!.shortCode);
                    setMsg(t('common.copied'));
                  }}
                />
              </View>
              <Txt>{g!.phoneE164 ? formatPhone(g!.phoneE164, country) : t('guests.noPhone')}</Txt>
              {g!.groupLabel ? (
                <Txt color={c.muted}>
                  {t('guestDetail.group')}: {g!.groupLabel}
                </Txt>
              ) : null}
              {contribution ? (
                <Txt color={c.muted}>
                  {t('guestDetail.cardKind')}: {t('guests.cardKindContribution')}
                </Txt>
              ) : (
                <>
                  <Txt color={c.muted}>
                    {t('guestDetail.partyAllowed', { count: g!.partySizeAllowed })}
                  </Txt>
                  <Txt size={14} color={c.muted}>
                    {t('guestDetail.version', { version: g!.tokenVersion })}
                  </Txt>
                </>
              )}
            </Card>
            <Card>
              <Txt bold size={20}>
                {t(contribution ? 'guestDetail.timelineContribution' : 'guestDetail.timeline')}
              </Txt>
              {steps.map((s, i) => (
                <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Txt color={i <= reached ? c.success : c.muted}>{i <= reached ? '●' : '○'}</Txt>
                  <Txt color={i <= reached ? c.ink : c.muted}>{t(`timelineStatus.${s}`)}</Txt>
                </View>
              ))}
              {g!.status === 'declined' ? (
                <Pill label={t('status.declined')} tone="danger" />
              ) : null}
              {statusKey(g!) === 'failed' ? (
                <Pill label={t('status.failed')} tone="danger" />
              ) : null}
            </Card>
            <Button
              variant="secondary"
              label={t('guestDetail.changeCardKind')}
              onPress={() => setConfirm('cardKind')}
            />
            <Button
              variant="secondary"
              label={t('guestDetail.reissue')}
              onPress={() => setConfirm('reissue')}
            />
            <Button
              variant="danger"
              label={t('guests.bulkDelete')}
              onPress={() => setConfirm('delete')}
            />
          </>
        )}
      </Screen>
      <ConfirmSheet
        open={confirm === 'reissue'}
        title={t('guestDetail.reissueTitle', { name: g?.displayName ?? '' })}
        body={t('guestDetail.reissueBody', {
          name: g?.displayName ?? '',
          version: g?.tokenVersion ?? 1,
        })}
        confirmLabel={t('guestDetail.reissue')}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          const u = await reissue.mutateAsync(gid).catch(() => null);
          setMsg(
            u ? t('guestDetail.reissued', { version: u.tokenVersion }) : t('states.errorBody'),
          );
        }}
      />
      <ConfirmSheet
        open={confirm === 'cardKind'}
        title={t(contribution ? 'guestDetail.toInvitation' : 'guestDetail.toContribution')}
        body={t(contribution ? 'guestDetail.toInvitationBody' : 'guestDetail.toContributionBody', {
          name: g?.displayName ?? '',
        })}
        confirmLabel={t(contribution ? 'guestDetail.toInvitation' : 'guestDetail.toContribution')}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          const u = await update
            .mutateAsync({ guestId: gid, patch: { cardKind: nextKind } })
            .catch(() => null);
          setMsg(u ? t('guests.cardKindUpdated', { count: 1 }) : t('states.errorBody'));
        }}
      />
      <ConfirmSheet
        open={confirm === 'delete'}
        danger
        title={t('guests.deleteTitle', { count: 1 })}
        body={t('guests.deleteBody')}
        confirmLabel={t('guests.bulkDelete')}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          await del.mutateAsync(gid).catch(() => null);
          router.back();
        }}
      />
    </View>
  );
}
