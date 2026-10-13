'use client';

import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { RotateCcw } from 'lucide-react';
import { errorCode } from '@harusi/api-client';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/display';

export function ErrorState({
  error,
  onRetry,
  compact,
}: {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const t = useTranslations('states');
  const tc = useTranslations('common');
  const code = errorCode(error);
  if (compact) {
    return (
      <Banner
        tone="error"
        title={t('errorTitle')}
        live="polite"
        action={
          onRetry ? (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              {tc('retry')}
            </Button>
          ) : undefined
        }
      >
        <span className="text-muted">{tc('errorCode', { code })}</span>
      </Banner>
    );
  }
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-4 py-10 text-center"
      data-testid="error-state"
    >
      <p className="text-lg font-semibold">{t('errorTitle')}</p>
      <p className="max-w-md text-muted">{t('errorBody')}</p>
      {onRetry ? (
        <Button onClick={onRetry} icon={<RotateCcw className="size-5" aria-hidden="true" />}>
          {tc('retry')}
        </Button>
      ) : null}
      <p className="text-xs text-muted">{tc('errorCode', { code })}</p>
    </div>
  );
}

/** Loading → skeleton, error → retry, success → children (§17.10). */
export function QueryState<T>({
  query,
  skeleton,
  children,
  isEmpty,
  empty,
}: {
  query: UseQueryResult<T>;
  skeleton: ReactNode;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
}) {
  const tc = useTranslations('common');
  if (query.isPending) {
    return (
      <div aria-busy="true">
        <span className="sr-only" role="status">
          {tc('loading')}
        </span>
        {skeleton}
      </div>
    );
  }
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (isEmpty?.(query.data) && empty) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
