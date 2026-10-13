'use client';

import { useTranslations } from 'next-intl';
import type { FieldError } from 'react-hook-form';

/** zod messages are i18n keys under `validation` (e.g. `phone.wrong_length`). */
export function useFieldError() {
  const t = useTranslations('validation');
  return (err: FieldError | undefined): string | undefined => {
    if (!err) return undefined;
    const key = err.message ?? '';
    return t.has(key as never) ? t(key as never) : t('generic');
  };
}
