import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import type { GuestFilter } from '@harusi/api-client';
import { useGuests } from '../../../../../src/lib/queries';
import { useT } from '../../../../../src/lib/i18n';
import { initials, statusKey } from '../../../../../src/lib/format';
import { useColors } from '../../../../../src/lib/theme';
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Pill,
  Row,
  Screen,
  Sheet,
  Skeleton,
  Txt,
} from '../../../../../src/ui/kit';

const FILTERS: GuestFilter[] = [
  'all',
  'unsent',
  'confirmed',
  'no_reply',
  'declined',
  'no_smartphone',
];
const TONE = {
  confirmed: 'success',
  checked_in: 'success',
  declined: 'danger',
  failed: 'danger',
  opened: 'info',
  delivered: 'info',
} as const;

export default function Guests() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [sheet, setSheet] = useState(false);
  const query = useMemo(() => ({ search, filter }), [search, filter]);
  const q = useGuests(id, query);

  return (
    <Screen footer={<Button label={`＋ ${t('guests.add')}`} onPress={() => setSheet(true)} />}>
      <Field
        label={t('guests.searchLabel')}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={t(`guests.filters.${f}`)}
            active={f === filter}
            onPress={() => setFilter(f)}
          />
        ))}
      </ScrollView>
      {q.isPending ? (
        <>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState
          text={search || filter !== 'all' ? t('guests.emptyFiltered') : t('guests.empty')}
          action={
            search || filter !== 'all'
              ? {
                  label: t('guests.clearFilters'),
                  onPress: () => {
                    setSearch('');
                    setFilter('all');
                  },
                }
              : {
                  label: t('guests.addImport'),
                  onPress: () => router.push(`/event/${id}/guests/import`),
                }
          }
        />
      ) : (
        q.data.map((g) => {
          const sk = statusKey(g);
          return (
            <Row
              key={g.id}
              onPress={() => router.push(`/event/${id}/guest/${g.id}`)}
              label={g.displayName}
            >
              <Avatar text={initials(g.displayName)} />
              <View style={{ flex: 1 }}>
                <Txt bold numberOfLines={1}>
                  {g.displayName}
                </Txt>
                <Txt size={14} color={c.muted} numberOfLines={1}>
                  {[
                    g.groupLabel,
                    g.shortCode,
                    g.phoneE164
                      ? t(`channel.${g.channelLast ?? (g.hasSmartphone ? 'whatsapp' : 'sms')}`)
                      : t('guests.noPhone'),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Txt>
              </View>
              <Pill label={t(`status.${sk}`)} tone={TONE[sk as keyof typeof TONE] ?? 'neutral'} />
            </Row>
          );
        })
      )}
      <Sheet open={sheet} onClose={() => setSheet(false)} title={t('guests.add')}>
        <Button
          label={t('guests.addOne')}
          onPress={() => {
            setSheet(false);
            router.push(`/event/${id}/guests/new`);
          }}
        />
        <Button
          variant="secondary"
          label={t('guests.addImport')}
          onPress={() => {
            setSheet(false);
            router.push(`/event/${id}/guests/import`);
          }}
        />
      </Sheet>
    </Screen>
  );
}
