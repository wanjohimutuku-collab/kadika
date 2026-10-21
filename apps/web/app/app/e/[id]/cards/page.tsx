'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Check, FileDown, Grid2x2, ImagePlus, Ruler } from 'lucide-react';
import {
  contrastRatio,
  paletteContrastIssues,
  resolvePalette,
  sanitizeOverrides,
  themeContrastIssues,
  themeIds,
  themes,
  type PaletteOverrides,
  type ThemeId,
} from '@harusi/ui-tokens';
import { PaletteEditor } from '@/components/console/palette-editor';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { CardPreview } from '@/components/console/card-preview';
import { PrintCard, type PrintFormat } from '@/components/console/print-card';
import { Button } from '@/components/ui/button';
import { Banner, Card, Skeleton } from '@/components/ui/display';
import { SegmentedControl } from '@/components/ui/navigation';
import { TextField, Textarea } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk, useEvent } from '@/lib/queries';
import { useQuotaToast } from '@/components/console/quota';
import { minPrintSizeMm, printQrIssues, qrMatrix } from '@/lib/qr';
import { downloadBlob } from '@/lib/download';
import { cn } from '@/lib/cn';

const SAMPLE_PAYLOAD = 'v1.0192f1a0.preview0.2.1.MOCKSIG';
const COVERS = [
  { id: 'theme', value: '' },
  { id: 'sunset', value: 'linear-gradient(160deg,#7A3E2B 0%,#C2703D 45%,#E8B66B 100%)' },
  { id: 'garden', value: 'linear-gradient(160deg,#20402F 0%,#3F6E4E 50%,#A9C48E 100%)' },
] as const;

export default function CardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('cards');
  const tw = useTranslations('wizard');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const toast = useToast();
  const queryClient = useQueryClient();
  const event = useEvent(id);
  const [themeId, setThemeId] = useState<ThemeId>('emerald-gold');
  const [cover, setCover] = useState('');
  const [palette, setPalette] = useState<PaletteOverrides>({});
  const [greeting, setGreeting] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [format, setFormat] = useState<PrintFormat>('A6');
  const [qrMm, setQrMm] = useState(30);
  const [view, setView] = useState<'phone' | 'print'>('phone');

  useEffect(() => {
    if (!event.data) return;
    setThemeId(event.data.themeId);
    setCover(event.data.coverGradient);
    setPalette(sanitizeOverrides(event.data.palette));
    setGreeting(event.data.greeting);
    setDressCode(event.data.dressCode);
    setExtraNote(event.data.extraNote);
  }, [event.data]);

  const modules = useMemo(() => qrMatrix(SAMPLE_PAYLOAD).size, []);
  const minMm = minPrintSizeMm(modules);
  const issues = printQrIssues(qrMm, modules);
  const contrastIssues = paletteContrastIssues(resolvePalette(themeId, palette));

  const save = useMutation({
    mutationFn: () =>
      getRepository().updateEvent(id, {
        themeId,
        coverGradient: cover,
        palette,
        greeting,
        dressCode,
        extraNote,
      }),
    onSuccess: async () => {
      toast({ tone: 'success', title: t('saved') });
      await queryClient.invalidateQueries({ queryKey: qk.event(id) });
    },
    onError: () => toast({ tone: 'error', title: ts('rolledBack') }),
  });
  const quota = useQuotaToast(id);
  const guests = useQuery({
    queryKey: qk.guests(id),
    queryFn: () => getRepository().listGuests(id),
  });
  const marked = (guests.data ?? []).filter((g) => g.printCard && g.cardKind === 'invitation');
  const fresh = marked.filter((g) => !g.cardGenerated).length;
  // ADR 042: the PDF holds every guest chosen for a printed card; new cards are generated (charged) once.
  const pdf = useMutation({
    mutationFn: (layout: 'single' | 'a4-4up' | 'test-sheet') =>
      getRepository().requestCardsPdf(id, {
        format,
        layout,
        ...(layout === 'test-sheet' ? {} : { marked: true }),
      }),
    onSuccess: async (blob, layout) => {
      downloadBlob(blob, `kadi-${layout}-${format}.pdf`);
      toast({ tone: 'success', title: t('pdfReady') });
      await queryClient.invalidateQueries({ queryKey: qk.guests(id) });
      await queryClient.invalidateQueries({ queryKey: qk.billing(id) });
    },
    onError: (e) => quota(e) || toast({ tone: 'error', title: ts('errorTitle') }),
  });

  return (
    <QueryState query={event} skeleton={<Skeleton className="h-96" />}>
      {(e) => {
        const data = {
          eventKind: e.eventKind,
          partnerA: e.partnerA,
          partnerB: e.partnerB,
          dateStart: e.dateStart,
          venueName: e.venueName,
          dressCode,
          themeId,
          coverGradient: cover,
          palette,
          greeting,
          extraNote,
          senderName: e.senderName,
          committeePhone: e.committeePhone,
        };
        return (
          <>
            <PageHeader
              title={t('title')}
              actions={
                <Button
                  onClick={() => save.mutate()}
                  loading={save.isPending}
                  disabled={contrastIssues.length > 0}
                >
                  {t('save')}
                </Button>
              }
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              <div className="flex flex-col gap-5">
                <Card title={t('themes')} titleId="th-h">
                  <div
                    className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2"
                    role="radiogroup"
                    aria-labelledby="th-h"
                  >
                    {themeIds.map((tid) => {
                      const th = themes[tid];
                      const ratio = contrastRatio(th.onPrimary, th.primary);
                      const ok = themeContrastIssues(th).length === 0;
                      return (
                        <label
                          key={tid}
                          className={cn(
                            'flex w-44 shrink-0 snap-start cursor-pointer flex-col gap-2 rounded-card border-2 p-3',
                            themeId === tid ? 'border-primary' : 'border-border',
                          )}
                        >
                          <input
                            type="radio"
                            name="theme"
                            className="sr-only"
                            checked={themeId === tid}
                            onChange={() => setThemeId(tid)}
                          />
                          <span
                            className="flex h-16 flex-col justify-end rounded-input p-2 text-lg text-white"
                            style={{ background: th.primary }}
                            aria-hidden="true"
                          >
                            A &amp; J
                            <span
                              className="mt-1 h-1 w-10 rounded"
                              style={{ background: th.accent }}
                            />
                          </span>
                          <span className="flex items-center justify-between font-medium">
                            {tw(`themes.${tid}`)}
                            {themeId === tid ? (
                              <Check className="size-5 text-primary" aria-hidden="true" />
                            ) : null}
                          </span>
                          <span className={cn('text-xs', ok ? 'text-success' : 'text-danger')}>
                            {ok
                              ? t('contrastOk', { ratio: ratio.toFixed(1) })
                              : t('contrastFail', { ratio: ratio.toFixed(1) })}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <fieldset className="mt-3">
                    <legend className="mb-2 text-sm font-semibold">{t('cover')}</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {COVERS.map((c) => (
                        <label
                          key={c.id}
                          className={cn(
                            'flex cursor-pointer flex-col items-center gap-1 rounded-card border-2 p-2 text-sm',
                            cover === c.value ? 'border-primary' : 'border-border',
                          )}
                        >
                          <input
                            type="radio"
                            name="cover"
                            className="sr-only"
                            checked={cover === c.value}
                            onChange={() => setCover(c.value)}
                          />
                          <span
                            className="flex h-10 w-full items-center justify-center rounded-input text-white"
                            style={{
                              background: c.value || resolvePalette(themeId, palette).primary,
                            }}
                            aria-hidden="true"
                          >
                            {c.id !== 'theme' ? <ImagePlus className="size-4" /> : null}
                          </span>
                          {c.id === 'theme'
                            ? tw('coverNone')
                            : c.id === 'sunset'
                              ? tw('coverSunset')
                              : tw('coverGarden')}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </Card>

                <Card title={t('palette')} titleId="pal-h">
                  <PaletteEditor
                    themeId={themeId}
                    overrides={palette}
                    onChange={setPalette}
                    issues={contrastIssues}
                  />
                </Card>

                <Card title={t('wording')} titleId="wd-h">
                  <div className="flex flex-col gap-4">
                    <Textarea
                      label={t('greeting')}
                      hint={t('greetingHint')}
                      rows={2}
                      value={greeting}
                      onChange={(ev) => setGreeting(ev.target.value)}
                    />
                    <TextField
                      label={t('dressCode')}
                      value={dressCode}
                      onChange={(ev) => setDressCode(ev.target.value)}
                    />
                    <Textarea
                      label={t('extraNote')}
                      optionalLabel={tc('optional')}
                      rows={2}
                      value={extraNote}
                      onChange={(ev) => setExtraNote(ev.target.value)}
                    />
                  </div>
                </Card>

                <Card title={t('printPreview')} titleId="pr-h">
                  <div className="flex flex-col gap-4">
                    <SegmentedControl<PrintFormat>
                      label={t('format')}
                      value={format}
                      onChange={setFormat}
                      options={[
                        { value: 'A6', label: 'A6' },
                        { value: 'A5', label: 'A5' },
                      ]}
                    />
                    <TextField
                      label={t('qrSize')}
                      type="number"
                      inputMode="decimal"
                      min={15}
                      max={60}
                      step={1}
                      value={qrMm}
                      onChange={(ev) => setQrMm(Number(ev.target.value))}
                      suffix="mm"
                      error={issues.length ? t('qrTooSmall', { min: minMm }) : undefined}
                      hint={!issues.length ? t('qrOk', { size: qrMm }) : undefined}
                      data-testid="qr-size"
                    />
                    <p className="flex items-start gap-2 text-sm text-muted">
                      <Ruler className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {t('printRules')}
                    </p>
                    {issues.length ? (
                      <Banner
                        tone="error"
                        live="assertive"
                        title={t('qrTooSmall', { min: minMm })}
                      />
                    ) : null}
                    <div className="flex flex-col gap-1" data-testid="print-generate">
                      <p className="font-semibold">{t('generateTitle')}</p>
                      <p className="text-sm text-muted">
                        {t('generateIntro', { count: marked.length })}
                      </p>
                      {marked.length ? (
                        <p className="text-sm text-muted">{t('generateNew', { count: fresh })}</p>
                      ) : (
                        <Link
                          href={`/app/e/${id}/guests`}
                          className="text-sm font-semibold text-primary underline"
                        >
                          {t('chooseGuests')}
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        icon={<FileDown className="size-4" aria-hidden="true" />}
                        disabled={issues.length > 0 || marked.length === 0}
                        onClick={() => pdf.mutate('single')}
                        loading={pdf.isPending && pdf.variables === 'single'}
                        data-testid="download-pdf"
                      >
                        {t('generateAll')}
                      </Button>
                      <Button
                        variant="secondary"
                        icon={<Ruler className="size-4" aria-hidden="true" />}
                        onClick={() => pdf.mutate('test-sheet')}
                        loading={pdf.isPending && pdf.variables === 'test-sheet'}
                      >
                        {t('testSheet')}
                      </Button>
                      <Button
                        variant="secondary"
                        icon={<Grid2x2 className="size-4" aria-hidden="true" />}
                        disabled={issues.length > 0 || marked.length === 0}
                        onClick={() => pdf.mutate('a4-4up')}
                        loading={pdf.isPending && pdf.variables === 'a4-4up'}
                      >
                        {t('generateCollate')}
                      </Button>
                    </div>
                    <p className="text-sm text-muted">{t('testSheetHelp')}</p>
                  </div>
                </Card>
              </div>

              <aside className="flex flex-col items-center gap-3 lg:sticky lg:top-20 lg:self-start">
                <SegmentedControl<'phone' | 'print'>
                  label={t('title')}
                  value={view}
                  onChange={setView}
                  options={[
                    { value: 'phone', label: t('phonePreview') },
                    { value: 'print', label: t('printPreview') },
                  ]}
                />
                {view === 'phone' ? (
                  <CardPreview data={data} />
                ) : (
                  <PrintCard
                    data={data}
                    format={format}
                    qrMm={qrMm}
                    payload={SAMPLE_PAYLOAD}
                    previewWidthPx={300}
                  />
                )}
              </aside>
            </div>
          </>
        );
      }}
    </QueryState>
  );
}
