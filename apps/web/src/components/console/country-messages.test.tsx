import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { pickMessages } from '@harusi/i18n';
import { CountryMessages } from './country-messages';

function Probe() {
  const t = useTranslations('pledges');
  const n = useTranslations('nav');
  return (
    <p>
      {t('amount')}|{n('pledges')}
    </p>
  );
}

const render = (country: 'TZ' | 'KE', locale: 'en' | 'sw' = 'en') =>
  renderToString(
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(locale, ['pledges', 'nav'])}
      timeZone="Africa/Dar_es_Salaam"
    >
      <CountryMessages country={country}>
        <Probe />
      </CountryMessages>
    </NextIntlClientProvider>,
  ).replace(/<!--.*?-->/g, '');

describe('CountryMessages', () => {
  it('leaves Tanzanian text as it is', () => {
    expect(render('TZ')).toContain('Amount (TZS)|Pledges');
  });
  it('shows Kenyan currency and vocabulary for a Kenyan event', () => {
    expect(render('KE')).toContain('Amount (KES)|Contributions');
    expect(render('KE', 'sw')).toContain('Kiasi (KES)|Michango');
  });
});
