'use client';

import type { ReactNode } from 'react';
import { NextIntlClientProvider, useLocale, useMessages, useTimeZone } from 'next-intl';
import { mergeVariant, type MessageCountry } from '@harusi/i18n/variants';

/**
 * Puts a country's wording (currency, local vocabulary; ADR 028) on top of the messages the console
 * already has. The country is only known once an event has loaded, so this wraps the event pages.
 */
export function CountryMessages({
  country,
  children,
}: {
  country: MessageCountry;
  children: ReactNode;
}) {
  const locale = useLocale() as 'sw' | 'en';
  const messages = useMessages();
  const timeZone = useTimeZone();
  if (country === 'TZ') return <>{children}</>;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={mergeVariant(messages, locale, country)}
      timeZone={timeZone}
    >
      {children}
    </NextIntlClientProvider>
  );
}
