import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@harusi/i18n';
import { Banner } from '@/components/ui/display';
import { formatDate } from '@/lib/format';

const UPDATED = '2026-10-13T09:00:00Z';

export async function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const t = await getTranslations('legal');
  const locale = (await getLocale()) as Locale;
  const sections =
    kind === 'privacy'
      ? ([
          'collect',
          'use',
          'processors',
          'retention',
          'device',
          'rights',
          'security',
          'contact',
        ] as const)
      : (['account', 'messages', 'payments', 'gate', 'liability'] as const);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <Banner tone="warning" title={t('draftBanner')} />
      <h1 className="text-4xl font-semibold">
        {t(kind === 'privacy' ? 'privacyTitle' : 'termsTitle')}
      </h1>
      <p className="text-sm text-muted">{t('updated', { date: formatDate(UPDATED, locale) })}</p>
      <p className="text-lg">{t(`${kind}.intro`)}</p>
      {sections.map((s) => (
        <section key={s} className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{t(`${kind}.${s}Title` as never)}</h2>
          <p className="leading-relaxed">{t(`${kind}.${s}` as never)}</p>
        </section>
      ))}
    </main>
  );
}
