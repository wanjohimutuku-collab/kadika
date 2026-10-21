import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import type { GuestFilter } from '@harusi/api-client';
import { CARD_KINDS, type CardKind } from '@harusi/schemas';
import { useEvent, useGuests } from '../../../../../src/lib/queries';
import { useT } from '../../../../../src/lib/i18n';
import { initials, statusKey } from '../../../../../src/lib/format';
import { useColors } from '../../../../../src/lib/theme';
import { Icon } from '../../../../../src/ui/icons';
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Pill,
  Row,
  Screen,
  SearchBox,
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
  const { id, card } = useGlobalSearchParams<{ id: string; card?: string }>();
  const t = useT();
  const c = useColors();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GuestFilter>('all');
  // which cards to list: everyone, or only invitation or contribution cards (ADR 040)
  const [cardKind, setCardKind] = useState<'all' | CardKind>(
    (CARD_KINDS as readonly string[]).includes(card ?? '') ? (card as CardKind) : 'all',
  );
  const [sheet, setSheet] = useState(false);
  const ev = useEvent(id);
  const contributionGuests = ev.data?.stats.contributionGuests ?? 0;
  const query = useMemo(
    () => ({ search, filter, cardKind: cardKind === 'all' ? undefined : cardKind }),
    [search, filter, cardKind],
  );
  const q = useGuests(id, query);
  const addQuery = cardKind === 'contribution' ? '?card=contribution' : '';

  return (
    <Screen footer={<Button icon="plus" label={t('guests.add')} onPress={() => setSheet(true)} />}>
      <SearchBox
        label={t('guests.searchLabel')}
        placeholder={t('common.search')}
        value={search}
        onChangeText={setSearch}
      />
      {contributionGuests > 0 || cardKind !== 'all' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          accessibilityLabel={t('guests.cardTypeLabel')}
        >
          {(['all', ...CARD_KINDS] as const).map((k) => (
            <Chip
              key={k}
              label={t(`guests.cardTypes.${k}`)}
              active={k === cardKind}
              onPress={() => setCardKind(k)}
            />
          ))}
        </ScrollView>
      ) : null}
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
          text={
            search || filter !== 'all' || cardKind !== 'all'
              ? t('guests.emptyFiltered')
              : t('guests.empty')
          }
          action={
            search || filter !== 'all' || cardKind !== 'all'
              ? {
                  label: t('guests.clearFilters'),
                  onPress: () => {
                    setSearch('');
                    setFilter('all');
                    setCardKind('all');
                  },
                }
              : {
                  label: t('guests.addImport'),
                  onPress: () => router.push(`/event/${id}/guests/import${addQuery}`),
                }
          }
        />
      ) : (
        <>
          <Txt size={13} color={c.muted}>
            {t('common.guestsCount', { count: q.data.length })}
          </Txt>
          {q.data.map((g) => {
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon
                      name={
                        !g.phoneE164
                          ? 'card'
                          : (g.channelLast ?? (g.hasSmartphone ? 'whatsapp' : 'sms')) === 'whatsapp'
                            ? 'whatsapp'
                            : 'sms'
                      }
                      size={14}
                      color={c.muted}
                    />
                    <Txt size={13} color={c.muted} numberOfLines={1}>
                      {[
                        g.groupLabel,
                        g.shortCode,
                        g.cardKind === 'contribution' ? t('guests.cardKindContribution') : '',
                      ]
                        .filter(Boolean)
                        .join(' · ') || t('guests.noPhone')}
                      {!g.phoneE164 ? ` · ${t('guests.noPhone')}` : ''}
                    </Txt>
                  </View>
                </View>
                <Pill label={t(`status.${sk}`)} tone={TONE[sk as keyof typeof TONE] ?? 'neutral'} />
              </Row>
            );
          })}
        </>
      )}
      <Sheet open={sheet} onClose={() => setSheet(false)} title={t('guests.add')}>
        <Button
          label={t('guests.addOne')}
          onPress={() => {
            setSheet(false);
            router.push(`/event/${id}/guests/new${addQuery}`);
          }}
        />
        <Button
          variant="secondary"
          label={t('guests.addImport')}
          onPress={() => {
            setSheet(false);
            router.push(`/event/${id}/guests/import${addQuery}`);
          }}
        />
      </Sheet>
    </Screen>
  );
}
