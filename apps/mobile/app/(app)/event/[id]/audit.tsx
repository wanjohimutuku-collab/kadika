import { useState } from 'react';
import { View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getRepository } from '../../../../src/lib/repo';
import { useLocale, useT } from '../../../../src/lib/i18n';
import { useColors } from '../../../../src/lib/theme';
import { AppHeader } from '../../../../src/ui/header';
import { Button, EmptyState, ErrorState, Row, Screen, Skeleton, Txt } from '../../../../src/ui/kit';

const when = (iso: string, locale: string) => {
  const d = new Date(new Date(iso).getTime() + 3 * 3_600_000); // Africa/Dar_es_Salaam, UTC+3
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}${locale === 'sw' ? '' : ' EAT'}`;
};

/** Who did what, newest first (§9). Owner only; the API refuses everyone else. */
export default function Audit() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const { locale } = useLocale();
  const [fetching, setFetching] = useState(false);
  const q = useInfiniteQuery({
    queryKey: ['audit', id],
    queryFn: ({ pageParam }) => getRepository().listAuditLog(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const label = (action: string) => {
    const key = `mobile.auditActions.${action.replace('.', '_')}`;
    const s = t(key);
    return s === key ? action : s;
  };
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={t('mobile.auditTitle')} onBack={() => router.back()} />
      <Screen>
        {q.isPending ? (
          <Skeleton />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState text={t('mobile.auditEmpty')} />
        ) : (
          items.map((i) => (
            <Row key={i.id}>
              <View style={{ flex: 1 }}>
                <Txt bold>{label(i.action)}</Txt>
                <Txt size={14} color={c.muted}>
                  {when(i.at, locale)} · {i.actor}
                </Txt>
              </View>
            </Row>
          ))
        )}
        {q.hasNextPage ? (
          <Button
            variant="secondary"
            label={t('mobile.auditMore')}
            loading={fetching}
            onPress={async () => {
              setFetching(true);
              await q.fetchNextPage();
              setFetching(false);
            }}
          />
        ) : null}
      </Screen>
    </View>
  );
}
