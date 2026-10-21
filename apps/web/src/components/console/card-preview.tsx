'use client';

import { useLocale, useTranslations } from 'next-intl';
import { MapPin, ShieldCheck, Shirt } from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { defaultSender, eventKindLabel, eventKindOf, hostNames } from '@harusi/schemas';
import { QrBlock } from '@/components/ui/qr-block';
import { OrnamentBand, OrnamentDiamond } from '@/components/card/ornament';
import {
  formatClock,
  formatDate,
  formatPhone,
  formatTime,
  formatWeekday,
  swahiliTime,
} from '@/lib/format';
import type { PaletteOverrides } from '@harusi/ui-tokens/palette';
import { themeStyle } from '@/lib/theme';

export interface CardPreviewData {
  eventKind?: string;
  partnerA: string;
  partnerB: string;
  dateStart: string;
  venueName: string;
  dressCode: string;
  themeId: string;
  coverGradient: string;
  palette?: PaletteOverrides;
  greeting?: string;
  extraNote?: string;
  senderName?: string;
  committeePhone?: string;
  guestName?: string;
  shortCode?: string;
}

const SAMPLE_PAYLOAD = 'v1.0192f1a0.preview0.2.1.MOCKSIG';

/** Live guest-card preview inside a phone frame (wizard, Kadi page). Not interactive. */
export function CardPreview({ data, compact }: { data: CardPreviewData; compact?: boolean }) {
  const t = useTranslations('card');
  const locale = useLocale() as Locale;
  const valid = !Number.isNaN(Date.parse(data.dateStart));
  return (
    <div
      className="mx-auto w-full max-w-[300px] rounded-[2rem] border-8 border-ink bg-ink shadow-xl"
      aria-hidden="true"
    >
      <div
        className="h-[540px] overflow-hidden overflow-y-auto rounded-[1.5rem] bg-surface"
        style={themeStyle(data.themeId, data.palette)}
      >
        <div
          className="relative text-center text-on-primary"
          style={{ background: data.coverGradient || 'var(--hp-primary)' }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.38))]" />
          <div className="relative flex flex-col items-center gap-0.5 px-3 pt-5 pb-5">
            <p className="text-[10px] tracking-[0.2em] uppercase opacity-90">
              {t('weddingOf', {
                kind: eventKindLabel(data.eventKind, locale),
                kindOf: eventKindOf(data.eventKind, locale),
              })}
            </p>
            <p className="font-display text-3xl leading-tight font-semibold">
              {hostNames(data.partnerA || '—', data.partnerB)}
            </p>
            <OrnamentDiamond className="my-0.5 [--hp-pattern:#fff]" />
            {valid ? (
              <>
                <p className="text-sm font-semibold">
                  {formatWeekday(data.dateStart, locale)} {formatDate(data.dateStart, locale)}
                </p>
                <p className="text-xs">
                  {locale === 'sw'
                    ? `Saa ${swahiliTime(data.dateStart)} (${formatClock(data.dateStart)})`
                    : formatTime(data.dateStart, locale)}
                </p>
              </>
            ) : null}
          </div>
          <OrnamentBand
            className="relative block bg-surface"
            id={`pv-band-${compact ? 'c' : 'f'}`}
          />
        </div>
        <div className="flex flex-col gap-3 p-3 text-xs">
          {data.greeting ? <p className="text-center">{data.greeting}</p> : null}
          <p className="text-center font-semibold">
            {t('invitesYou', { guest: data.guestName ?? 'Asha Mwinyi' })}
          </p>
          <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/8 p-2">
            <ShieldCheck className="size-4 shrink-0 text-success" />
            <div>
              <p className="font-semibold">
                {t('trustSender', {
                  sender:
                    data.senderName ||
                    defaultSender(
                      data.eventKind,
                      hostNames(data.partnerA, data.partnerB),
                      'committee',
                      locale,
                    ),
                })}
              </p>
              {data.committeePhone ? (
                <p>{t('trustCommitteePhone', { phone: formatPhone(data.committeePhone) })}</p>
              ) : null}
            </div>
          </div>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            <span className="font-semibold">{data.venueName || '—'}</span>
          </p>
          {data.dressCode ? (
            <p className="flex items-center gap-2">
              <Shirt className="size-4 text-primary" />
              {t('dressCode', { dressCode: data.dressCode })}
            </p>
          ) : null}
          {data.extraNote ? <p className="text-muted">{data.extraNote}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <span className="flex min-h-9 items-center justify-center rounded-md bg-primary font-semibold text-on-primary">
              {t('rsvpYes')}
            </span>
            <span className="flex min-h-9 items-center justify-center rounded-md border-2 border-primary font-semibold text-primary">
              {t('rsvpNo')}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-white p-2">
            <QrBlock payload={SAMPLE_PAYLOAD} alt="" size={120} />
            <span className="font-mono text-lg font-bold tracking-[0.15em] text-black">
              {data.shortCode ?? 'KH-4826'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
