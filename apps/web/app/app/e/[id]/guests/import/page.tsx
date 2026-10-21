'use client';

import { Suspense, use, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste,
  ContactRound,
  Download,
  FileSpreadsheet,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  buildPreview,
  CSV_TEMPLATE,
  guessMapping,
  parseCsv,
  parsePastedList,
  summarizePreview,
  type ImportField,
  type ImportRowInput,
  type PreviewRow,
} from '@harusi/api-client';
import type { CardKind } from '@harusi/schemas';
import { PageHeader } from '@/components/console/page-header';
import { CardKindPicker } from '@/components/console/guests/card-kind-picker';
import { ContactsSheet } from '@/components/console/guests/contacts-sheet';
import { Button, buttonClasses } from '@/components/ui/button';
import { Banner, KpiTile } from '@/components/ui/display';
import { Checkbox, FilePicker, TextField, Textarea } from '@/components/ui/form';
import { SegmentedControl } from '@/components/ui/navigation';
import { BottomSheet } from '@/components/ui/overlay';
import { PhoneField } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { getRepository, newIdempotencyKey } from '@/lib/repo';
import { eventScopedKeys, qk } from '@/lib/queries';
import { downloadBlob } from '@/lib/download';
import { cn } from '@/lib/cn';
import { useQuotaToast } from '@/components/console/quota';

type Source = 'paste' | 'csv' | 'contacts';
type Step = 'source' | 'preview' | 'confirm' | 'done';
const FIELDS: ImportField[] = ['name', 'phone', 'group', 'party', 'smartphone', 'ignore'];

function ImportInner({ id }: { id: string }) {
  const t = useTranslations('import');
  const tf = useTranslations('guestForm');
  const tv = useTranslations('validation');
  const tc = useTranslations('common');
  const tg = useTranslations('guestDetail');
  const ts = useTranslations('states');
  const toast = useToast();
  const quota = useQuotaToast(id);
  const queryClient = useQueryClient();
  const existing = useQuery({
    queryKey: qk.guests(id),
    queryFn: () => getRepository().listGuests(id),
  });

  // a link from the send page arrives with ?card=contribution: the whole list is asked for a contribution
  const [cardKind, setCardKind] = useState<CardKind>(
    useSearchParams().get('card') === 'contribution' ? 'contribution' : 'invitation',
  );
  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<Source>('paste');
  const [pasted, setPasted] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ImportField[]>([]);
  const [hasHeader, setHasHeader] = useState(false);
  const [defaultGroup, setDefaultGroup] = useState('');
  const [includeOverride, setIncludeOverride] = useState<Record<number, boolean>>({});
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [fixing, setFixing] = useState<PreviewRow | null>(null);
  const [fixName, setFixName] = useState('');
  const [fixPhone, setFixPhone] = useState('');
  const [contactsOpen, setContactsOpen] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const idem = useRef(newIdempotencyKey());

  const existingPhones = useMemo(
    () => (existing.data ?? []).map((g) => g.phoneE164).filter((p): p is string => !!p),
    [existing.data],
  );
  const existingNames = useMemo(
    () => (existing.data ?? []).map((g) => g.displayName),
    [existing.data],
  );

  const preview = useMemo(() => {
    const rows = buildPreview(rawRows, mapping, {
      hasHeader,
      existingPhones,
      existingNames,
      defaultGroup,
    });
    return rows.map((r) =>
      r.index in includeOverride ? { ...r, include: includeOverride[r.index]! } : r,
    );
  }, [rawRows, mapping, hasHeader, existingPhones, existingNames, defaultGroup, includeOverride]);
  const summary = useMemo(() => summarizePreview(preview), [preview]);
  const included = preview.filter(
    (r) => r.include && !r.issues.some((i) => i.kind !== 'duplicate'),
  );
  const visible = onlyProblems ? preview.filter((r) => r.issues.length) : preview;

  const load = (rows: string[][], fromFile: boolean) => {
    if (!rows.length) {
      setFileError(t('empty'));
      return;
    }
    const g = fromFile
      ? guessMapping(rows[0]!)
      : {
          mapping: ['name', 'phone', 'group', 'party'].slice(
            0,
            Math.max(...rows.map((r) => r.length)),
          ) as ImportField[],
          hasHeader: false,
        };
    const width = Math.max(...rows.map((r) => r.length));
    setRawRows(rows);
    setMapping(Array.from({ length: width }, (_, i) => g.mapping[i] ?? 'ignore'));
    setHasHeader(g.hasHeader);
    setIncludeOverride({});
    setStep('preview');
  };

  const commit = useMutation({
    mutationFn: (rows: ImportRowInput[]) =>
      getRepository().importGuests(id, rows, idem.current, { cardKind }),
    onSuccess: async (r) => {
      setResult(r);
      setStep('done');
      toast({ tone: 'success', title: t('done', { count: r.created }) });
      await Promise.all(
        eventScopedKeys(id).map((k) => queryClient.invalidateQueries({ queryKey: k })),
      );
    },
    onError: (e) => quota(e) || toast({ tone: 'error', title: ts('errorTitle') }),
  });

  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useWindowVirtualizer({
    count: visible.length,
    estimateSize: () => 72,
    overscan: 10,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const fixRow = (r: PreviewRow) => {
    setFixing(r);
    setFixName(r.displayName);
    setFixPhone(r.phoneRaw);
  };
  const applyFix = () => {
    if (!fixing) return;
    const nameCol = mapping.indexOf('name');
    const phoneCol = mapping.indexOf('phone');
    const rowIdx = fixing.index + (hasHeader ? 1 : 0);
    setRawRows((rows) =>
      rows.map((row, i) => {
        if (i !== rowIdx) return row;
        const next = [...row];
        if (nameCol >= 0) next[nameCol] = fixName;
        if (phoneCol >= 0) next[phoneCol] = fixPhone;
        return next;
      }),
    );
    setIncludeOverride((o) => {
      const n = { ...o };
      delete n[fixing.index];
      return n;
    });
    setFixing(null);
  };

  const issueText = (r: PreviewRow) =>
    r.issues
      .map((i) =>
        i.kind === 'phone'
          ? tv(`phone.${i.error}`)
          : i.kind === 'name'
            ? t('issue.name')
            : i.of === 'file'
              ? t('issue.duplicateFile', { row: (i.otherRow ?? 0) + 1 })
              : t('issue.duplicateExisting'),
      )
      .join(' · ');

  const stepIdx = ['source', 'preview', 'confirm'].indexOf(step === 'done' ? 'confirm' : step);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t('title')}
        back={
          <Link
            href={`/app/e/${id}/guests`}
            className="inline-flex min-h-10 items-center gap-1.5 self-start font-semibold text-primary"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            {tg('back')}
          </Link>
        }
      />
      <ol className="mb-5 grid grid-cols-3 gap-1.5">
        {(['source', 'preview', 'confirm'] as const).map((s, i) => (
          <li
            key={s}
            aria-current={i === stepIdx ? 'step' : undefined}
            className="flex flex-col gap-1"
          >
            <span className={cn('h-1.5 rounded-full', i <= stepIdx ? 'bg-primary' : 'bg-border')} />
            <span className={cn('text-sm', i === stepIdx ? 'font-semibold' : 'text-muted')}>
              {i + 1}. {t(`steps.${s}`)}
            </span>
          </li>
        ))}
      </ol>

      {step === 'source' ? (
        <section
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-6"
          data-testid="import-source"
        >
          <CardKindPicker
            name="importCardKind"
            testId="import-card-kind"
            legend={t('cardKind')}
            help={tf('cardKindHelp')}
            labels={{
              invitation: tf('cardKinds.invitation'),
              contribution: tf('cardKinds.contribution'),
            }}
            value={cardKind}
            onChange={setCardKind}
          />
          <SegmentedControl<Source>
            label={t('steps.source')}
            value={source}
            onChange={setSource}
            options={[
              {
                value: 'paste',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <ClipboardPaste className="size-4" aria-hidden="true" />
                    {t('sourcePaste')}
                  </span>
                ),
              },
              {
                value: 'csv',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <FileSpreadsheet className="size-4" aria-hidden="true" />
                    {t('sourceCsv')}
                  </span>
                ),
              },
              {
                value: 'contacts',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <ContactRound className="size-4" aria-hidden="true" />
                    {t('sourceContacts')}
                  </span>
                ),
              },
            ]}
          />
          {source === 'paste' ? (
            <Textarea
              label={t('pasteLabel')}
              hint={t('pasteHint')}
              rows={8}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              data-testid="import-paste"
            />
          ) : null}
          {source === 'csv' ? (
            <>
              <FilePicker
                label={fileName ?? t('csvLabel')}
                hint={t('csvHint')}
                accept=".csv,text/csv,text/plain"
                buttonLabel={t('chooseFile')}
                error={fileError ?? undefined}
                onFile={async (f) => {
                  setFileError(null);
                  setFileName(f.name);
                  try {
                    const text = await f.text();
                    const rows = parseCsv(text);
                    if (!rows.length || text.includes('\u0000')) setFileError(t('notCsv'));
                    else load(rows, true);
                  } catch {
                    setFileError(t('notCsv'));
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                icon={<Download className="size-4" aria-hidden="true" />}
                onClick={() =>
                  downloadBlob(
                    new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }),
                    'kiolezo-wageni.csv',
                  )
                }
              >
                {t('template')}
              </Button>
            </>
          ) : null}
          {source === 'contacts' ? (
            <Button
              variant="secondary"
              icon={<ContactRound className="size-5" aria-hidden="true" />}
              onClick={() => setContactsOpen(true)}
            >
              {t('sourceContacts')}
            </Button>
          ) : null}
          <TextField
            label={t('defaultGroup')}
            optionalLabel={tc('optional')}
            value={defaultGroup}
            onChange={(e) => setDefaultGroup(e.target.value)}
          />
          {fileError && source === 'paste' ? <Banner tone="error">{fileError}</Banner> : null}
          {source === 'paste' ? (
            <Button
              className="self-end"
              disabled={!pasted.trim()}
              onClick={() => {
                setFileError(null);
                load(parsePastedList(pasted), false);
              }}
              data-testid="import-read"
            >
              {t('read')}
            </Button>
          ) : null}
        </section>
      ) : null}

      {step === 'preview' ? (
        <section className="flex flex-col gap-4" data-testid="import-preview">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <KpiTile label={t('summary.total')} value={summary.total} />
            <KpiTile
              label={t('summary.valid')}
              value={summary.valid}
              tone="success"
              icon={<CheckCircle2 className="size-4" />}
            />
            <KpiTile
              label={t('summary.invalid')}
              value={summary.invalid}
              tone="danger"
              icon={<XCircle className="size-4" />}
            />
            <KpiTile
              label={t('summary.duplicates')}
              value={summary.duplicates}
              tone="warning"
              icon={<AlertTriangle className="size-4" />}
            />
            <KpiTile label={t('summary.withoutPhone')} value={summary.withoutPhone} />
          </div>
          {mapping.length > 1 ? (
            <details className="rounded-card border border-border bg-surface p-4" open={hasHeader}>
              <summary className="min-h-10 cursor-pointer font-semibold">{t('mapping')}</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {mapping.map((m, i) => (
                  <label key={i} className="flex flex-col gap-1 text-sm font-semibold">
                    {hasHeader && rawRows[0]?.[i]
                      ? `${t('column', { n: i + 1 })}: ${rawRows[0][i]}`
                      : t('column', { n: i + 1 })}
                    <select
                      value={m}
                      onChange={(e) =>
                        setMapping((mp) =>
                          mp.map((x, j) => (j === i ? (e.target.value as ImportField) : x)),
                        )
                      }
                      className="min-h-11 rounded-input border border-border bg-surface px-2 font-normal"
                    >
                      {FIELDS.map((f) => (
                        <option key={f} value={f}>
                          {t(`fields.${f}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <Checkbox
                label={t('hasHeader')}
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
                className="mt-2"
              />
            </details>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Checkbox
              label={t('onlyProblems')}
              checked={onlyProblems}
              onChange={(e) => setOnlyProblems(e.target.checked)}
            />
            <p className="text-sm text-muted">{t('nothingSaved')}</p>
          </div>
          <div
            ref={listRef}
            className="rounded-card border border-border bg-surface"
            role="list"
            aria-label={t('rowsLabel')}
          >
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const r = visible[vi.index]!;
                const invalid = r.issues.some((i) => i.kind !== 'duplicate');
                const dup = !invalid && r.issues.some((i) => i.kind === 'duplicate');
                return (
                  <div
                    key={r.index}
                    role="listitem"
                    className={cn(
                      'absolute inset-x-0 flex min-h-[72px] items-center gap-3 border-b border-border px-3 py-2',
                      invalid && 'bg-danger/6',
                      dup && 'bg-warning/10',
                    )}
                    style={{
                      transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)`,
                    }}
                  >
                    <input
                      type="checkbox"
                      className="size-5 shrink-0 accent-[var(--hp-primary)]"
                      checked={r.include}
                      disabled={invalid}
                      aria-label={t('include', { row: r.index + 1 })}
                      onChange={(e) =>
                        setIncludeOverride((o) => ({ ...o, [r.index]: e.target.checked }))
                      }
                    />
                    <span className="tabular w-10 shrink-0 text-sm text-muted">{r.index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.displayName || '—'}</p>
                      <p className="truncate text-sm text-muted">
                        {r.phoneRaw || '—'}
                        {r.groupLabel ? ` · ${r.groupLabel}` : ''}
                        {r.partySizeAllowed > 1 ? ` · ${r.partySizeAllowed}` : ''}
                      </p>
                      {r.issues.length ? (
                        <p
                          className={cn(
                            'flex items-center gap-1 text-sm font-medium',
                            invalid ? 'text-danger' : 'text-ink',
                          )}
                        >
                          {invalid ? (
                            <XCircle className="size-4 shrink-0" aria-hidden="true" />
                          ) : (
                            <AlertTriangle
                              className="size-4 shrink-0 text-warning"
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate">{issueText(r)}</span>
                        </p>
                      ) : null}
                    </div>
                    {r.issues.length ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Wrench className="size-4" aria-hidden="true" />}
                        onClick={() => fixRow(r)}
                      >
                        {t('fix')}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="secondary" onClick={() => setStep('source')}>
              {tc('back')}
            </Button>
            <Button
              onClick={() => setStep('confirm')}
              disabled={!included.length}
              data-testid="import-continue"
            >
              {tc('continue')} ({included.length})
            </Button>
          </div>
        </section>
      ) : null}

      {step === 'confirm' ? (
        <section
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-6"
          data-testid="import-confirm"
        >
          <h2 className="text-xl font-semibold">{t('confirmTitle', { count: included.length })}</h2>
          <p>{t('confirmBody', { skipped: summary.total - included.length })}</p>
          {cardKind === 'contribution' ? <p>{t('confirmContribution')}</p> : null}
          <p className="text-sm text-muted">{t('nothingSaved')}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="secondary" onClick={() => setStep('preview')}>
              {tc('back')}
            </Button>
            <Button
              loading={commit.isPending}
              data-testid="import-commit"
              onClick={() =>
                commit.mutate(
                  included.map((r) => ({
                    displayName: r.displayName,
                    phoneRaw: r.phoneRaw,
                    groupLabel: r.groupLabel,
                    partySizeAllowed: r.partySizeAllowed,
                    hasSmartphone: r.hasSmartphone,
                    inviteChannelPref: r.inviteChannelPref,
                  })),
                )
              }
            >
              {t('confirm', { count: included.length })}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 'done' && result ? (
        <section
          className="flex flex-col items-center gap-4 rounded-card border border-border bg-surface p-8 text-center"
          data-testid="import-done"
        >
          <CheckCircle2 className="size-12 text-success" aria-hidden="true" />
          <h2 className="text-2xl font-semibold">{t('done', { count: result.created })}</h2>
          {result.skipped ? (
            <p className="text-muted">{t('doneSkipped', { count: result.skipped })}</p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/app/e/${id}/guests`} className={buttonClasses('secondary')}>
              {t('goGuests')}
            </Link>
            <Link
              href={`/app/e/${id}/send${cardKind === 'contribution' ? '?card=contribution' : ''}`}
              className={buttonClasses('primary')}
            >
              {cardKind === 'contribution' ? t('goSendContribution') : t('goSend')}
            </Link>
          </div>
        </section>
      ) : null}

      <BottomSheet
        open={!!fixing}
        onOpenChange={(o) => !o && setFixing(null)}
        title={fixing ? t('fixTitle', { row: fixing.index + 1 }) : ''}
        closeLabel={tc('close')}
        footer={<Button onClick={applyFix}>{tc('save')}</Button>}
      >
        <div className="flex flex-col gap-4">
          <TextField
            label={t('fields.name')}
            value={fixName}
            onChange={(e) => setFixName(e.target.value)}
          />
          <PhoneField
            label={t('fields.phone')}
            value={fixPhone}
            onChange={setFixPhone}
            optionalLabel={tc('optional')}
          />
        </div>
      </BottomSheet>
      <ContactsSheet
        eventId={id}
        open={contactsOpen}
        onOpenChange={setContactsOpen}
        onImported={() =>
          void Promise.all(
            eventScopedKeys(id).map((k) => queryClient.invalidateQueries({ queryKey: k })),
          )
        }
        cardKind={cardKind}
      />
    </div>
  );
}

export default function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <ImportInner id={id} />
    </Suspense>
  );
}
