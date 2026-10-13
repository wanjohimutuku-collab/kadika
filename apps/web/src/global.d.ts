import type { Messages } from '@harusi/i18n';
import type { Locale } from '@harusi/i18n';

declare module 'next-intl' {
  interface AppConfig {
    Messages: Messages;
    Locale: Locale;
  }
}
