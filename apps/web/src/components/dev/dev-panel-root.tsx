'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { Locale, Messages } from '@harusi/i18n';
import { DevPanel } from './dev-panel';

export function DevPanelRoot({
  locale,
  messages,
  onClose,
}: {
  locale: Locale;
  messages: Pick<Messages, 'dev' | 'common'>;
  onClose: () => void;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Africa/Dar_es_Salaam">
      <DevPanel onClose={onClose} />
    </NextIntlClientProvider>
  );
}
