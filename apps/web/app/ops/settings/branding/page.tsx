'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Save, Trash2 } from 'lucide-react';
import { RepositoryError } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import {
  BODY_FONT_KEYS,
  BUSINESS_NAME_MAX,
  DISPLAY_FONT_KEYS,
  FONT_STACKS,
  LOGO_MIMES,
  MAX_LOGO_BYTES,
  TAGLINE_MAX,
  validateSvg,
  type BodyFontKey,
  type BrandingView,
  type DisplayFontKey,
  type FontKey,
} from '@harusi/schemas/branding';
import {
  contrastRatio,
  lightColors,
  MIN_NON_TEXT_CONTRAST,
  MIN_TEXT_CONTRAST,
  normalizeHex,
} from '@harusi/ui-tokens';
import { QueryState } from '@/components/console/query-state';
import { Button, buttonClasses } from '@/components/ui/button';
import { Banner, Card, Skeleton } from '@/components/ui/display';
import { Select, TextField } from '@/components/ui/form';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { useBrand } from '@/components/brand/brand-provider';
import { brandStyle, fileToBase64, resolveLogoSrc, sanitizePublicBranding } from '@/lib/branding';
import { formatRelative } from '@/lib/format';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';

const WHITE = '#FFFFFF';
/** White or near-black, whichever reads better: the same rule the API applies. */
const onPrimaryFor = (primary: string) =>
  contrastRatio(WHITE, primary) >= contrastRatio(lightColors.ink, primary)
    ? WHITE
    : lightColors.ink;

/** Business branding (ADR 036): name, logo (SVG supported), theme colours and fonts. Admin staff only. */
export default function BrandingPage() {
  const t = useTranslations('ops.branding');
  const q = useQuery({
    queryKey: qk.ops('branding'),
    queryFn: () => getRepository().opsBranding(),
  });
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-muted">{t('intro')}</p>
      <QueryState query={q} skeleton={<Skeleton className="h-96" />}>
        {(v) => <BrandingForm view={v} />}
      </QueryState>
    </div>
  );
}

function explain(e: unknown, t: (k: string) => string): string {
  if (!(e instanceof RepositoryError)) return String(e);
  const reason = e.details?.reason;
  if (typeof reason === 'string') {
    try {
      return t(`logo.reasons.${reason}`);
    } catch {
      /* fall through to the server's own words */
    }
  }
  return e.message;
}

function BrandingForm({ view }: { view: BrandingView }) {
  const t = useTranslations('ops.branding');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const { setBrand } = useBrand();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(view.businessName);
  const [tagline, setTagline] = useState(view.tagline);
  const [primary, setPrimary] = useState(view.primary ?? '');
  const [accent, setAccent] = useState(view.accent ?? '');
  const [fontBody, setFontBody] = useState<BodyFontKey>(view.fontBody);
  const [fontDisplay, setFontDisplay] = useState<DisplayFontKey>(view.fontDisplay);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // A save returns the stored values: show them.
  useEffect(() => {
    setName(view.businessName);
    setTagline(view.tagline);
    setPrimary(view.primary ?? '');
    setAccent(view.accent ?? '');
    setFontBody(view.fontBody);
    setFontDisplay(view.fontDisplay);
  }, [view]);

  // A saved change shows at once in this tab (header, colours, fonts); other visitors get it within a minute.
  const store = (v: BrandingView) => {
    queryClient.setQueryData(qk.ops('branding'), v);
    setBrand(sanitizePublicBranding(v));
  };

  const save = useMutation({
    mutationFn: () =>
      getRepository().opsSaveBranding({
        businessName: name,
        tagline,
        primary: primary.trim() || null,
        accent: accent.trim() || null,
        fontBody,
        fontDisplay,
      }),
    onSuccess: (v) => {
      setError(null);
      store(v);
      toast({ tone: 'success', title: t('saved') });
    },
    onError: (e) => setError(explain(e, t as never) || t('errorGeneric')),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!(LOGO_MIMES as readonly string[]).includes(file.type))
        throw new RepositoryError('validation', t('logo.reasons.bad_type'));
      if (file.size > MAX_LOGO_BYTES)
        throw new RepositoryError('validation', t('logo.reasons.too_large'));
      if (file.type === 'image/svg+xml') {
        const check = validateSvg(await file.text());
        if (!check.ok)
          throw new RepositoryError('validation', t(`logo.reasons.${check.reason}` as never));
        return getRepository().opsSetLogo({ mime: file.type, data: check.svg });
      }
      return getRepository().opsSetLogo({ mime: file.type, data: await fileToBase64(file) });
    },
    onSuccess: (v) => {
      setLogoError(null);
      store(v);
      toast({ tone: 'success', title: t('logo.saved') });
    },
    onError: (e) => setLogoError(explain(e, t as never)),
  });

  const remove = useMutation({
    mutationFn: () => getRepository().opsRemoveLogo(),
    onSuccess: (v) => {
      setConfirmRemove(false);
      store(v);
      toast({ tone: 'success', title: t('logo.removed') });
    },
    onError: (e) => setLogoError(explain(e, t as never)),
  });

  // Live contrast feedback with the same bars the API enforces (event themes, ADR 006).
  const p = normalizeHex(primary);
  const a = normalizeHex(accent);
  const primaryRatio = p
    ? Math.min(
        contrastRatio(onPrimaryFor(p), p),
        contrastRatio(p, lightColors.bg),
        contrastRatio(p, lightColors.surface),
      )
    : null;
  const accentRatio = a ? contrastRatio(a, lightColors.surface) : null;
  const primaryBad = primaryRatio !== null && primaryRatio < MIN_TEXT_CONTRAST;
  const accentBad = accentRatio !== null && accentRatio < MIN_NON_TEXT_CONTRAST;
  const colourHint = (value: string, parsed: string | null, ratio: number | null, min: number) =>
    value.trim() && !parsed
      ? undefined
      : ratio === null
        ? t('colours.default')
        : ratio >= min
          ? t('colours.readable', { ratio: ratio.toFixed(1) })
          : t('colours.hard', { ratio: ratio.toFixed(1), min });

  const dirty =
    name !== view.businessName ||
    tagline !== view.tagline ||
    (primary.trim() || null) !== view.primary ||
    (accent.trim() || null) !== view.accent ||
    fontBody !== view.fontBody ||
    fontDisplay !== view.fontDisplay;
  const invalidColour = (primary.trim() && !p) || (accent.trim() && !a);
  const logoSrc = resolveLogoSrc(view.logoUrl);

  const preview = brandStyle({
    primary: p,
    accent: a,
    onPrimary: p ? onPrimaryFor(p) : null,
    fontBody,
    fontDisplay,
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
      <form
        className="flex flex-col gap-5"
        data-testid="branding-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <p className="text-sm text-muted">
          {view.source === 'database'
            ? t('sourceDatabase', {
                when: view.updatedAt ? formatRelative(view.updatedAt, locale) : '—',
                by: view.updatedBy ?? '—',
              })
            : t('sourceDefault')}
        </p>

        <Card title={t('identity')} titleId="brand-identity">
          <div className="grid gap-4">
            <TextField
              label={t('businessName')}
              value={name}
              maxLength={BUSINESS_NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <TextField
              label={t('tagline')}
              optionalLabel={tc('optional')}
              hint={t('taglineHint')}
              value={tagline}
              maxLength={TAGLINE_MAX}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>
        </Card>

        <Card title={t('logo.title')} titleId="brand-logo">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <div
                className="flex h-20 min-w-40 items-center justify-center rounded-input border border-dashed border-border bg-bg p-2"
                data-testid="brand-logo-box"
              >
                {logoSrc ? (
                  // an SVG from the API; never inlined
                  <img
                    src={logoSrc}
                    alt={t('logo.alt', { name: view.businessName })}
                    className="max-h-16 max-w-56 object-contain"
                    data-testid="brand-logo"
                  />
                ) : (
                  <span className="px-2 text-center text-sm text-muted">{t('logo.none')}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp"
                  className="sr-only"
                  data-testid="brand-logo-input"
                  aria-label={t('logo.choose')}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) upload.mutate(f);
                  }}
                />
                <Button
                  variant="secondary"
                  loading={upload.isPending}
                  icon={<ImagePlus className="size-4" aria-hidden="true" />}
                  onClick={() => fileRef.current?.click()}
                >
                  {logoSrc ? t('logo.replace') : t('logo.choose')}
                </Button>
                {logoSrc ? (
                  <Button
                    variant="ghost"
                    icon={<Trash2 className="size-4" aria-hidden="true" />}
                    onClick={() => setConfirmRemove(true)}
                  >
                    {t('logo.remove')}
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-sm text-muted">{t('logo.hint')}</p>
            <p className="text-sm text-muted">{t('logo.svgNote')}</p>
            {logoError ? (
              <Banner tone="error">
                <span role="alert" data-testid="brand-logo-error">
                  {logoError}
                </span>
              </Banner>
            ) : null}
          </div>
        </Card>

        <Card title={t('colours.title')} titleId="brand-colours">
          <div className="grid gap-4 md:grid-cols-2">
            <ColourField
              label={t('colours.primary')}
              pick={t('colours.pick')}
              value={primary}
              onChange={setPrimary}
              fallback={lightColors.primary}
              error={primary.trim() && !p ? t('colours.invalid') : undefined}
              hint={colourHint(primary, p, primaryRatio, MIN_TEXT_CONTRAST)}
              bad={primaryBad}
              testId="brand-primary"
            />
            <ColourField
              label={t('colours.accent')}
              pick={t('colours.pick')}
              value={accent}
              onChange={setAccent}
              fallback={lightColors.accent}
              error={accent.trim() && !a ? t('colours.invalid') : undefined}
              hint={colourHint(accent, a, accentRatio, MIN_NON_TEXT_CONTRAST)}
              bad={accentBad}
              testId="brand-accent"
            />
          </div>
          <p className="mt-3 text-sm text-muted">{t('colours.hint')}</p>
          {primary || accent ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setPrimary('');
                setAccent('');
              }}
            >
              {t('colours.useDefault')}
            </Button>
          ) : null}
        </Card>

        <Card title={t('fonts.title')} titleId="brand-fonts">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label={t('fonts.body')}
              value={fontBody}
              onChange={(e) => setFontBody(e.target.value as BodyFontKey)}
              options={BODY_FONT_KEYS.map((k) => ({ value: k, label: t(`fonts.names.${k}`) }))}
            />
            <Select
              label={t('fonts.display')}
              value={fontDisplay}
              onChange={(e) => setFontDisplay(e.target.value as DisplayFontKey)}
              options={DISPLAY_FONT_KEYS.map((k) => ({ value: k, label: t(`fonts.names.${k}`) }))}
            />
          </div>
          <p className="mt-3 text-sm text-muted">{t('fonts.note')}</p>
        </Card>

        {error ? (
          <Banner tone="error">
            <span role="alert">{error}</span>
          </Banner>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            loading={save.isPending}
            disabled={!dirty || !!invalidColour || primaryBad || accentBad || !name.trim()}
            icon={<Save className="size-4" aria-hidden="true" />}
            data-testid="brand-save"
          >
            {t('save')}
          </Button>
          {dirty ? <span className="text-sm text-muted">{t('preview.unsaved')}</span> : null}
        </div>
      </form>

      <Card title={t('preview.title')} titleId="brand-preview" className="lg:sticky lg:top-20">
        <div
          style={preview}
          className="overflow-hidden rounded-card border border-border bg-bg"
          data-testid="brand-preview"
        >
          <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
            {logoSrc ? (
              // see above
              <img src={logoSrc} alt="" className="max-h-9 max-w-32 object-contain" />
            ) : null}
            <span
              className="text-lg font-semibold text-primary"
              style={{ fontFamily: FONT_STACKS[fontDisplay as FontKey] }}
            >
              {name || '—'}
            </span>
          </div>
          <div
            className="flex flex-col gap-3 p-4"
            style={{ fontFamily: FONT_STACKS[fontBody as FontKey] }}
          >
            <h3
              className="text-2xl font-semibold"
              style={{ fontFamily: FONT_STACKS[fontDisplay as FontKey] }}
            >
              {t('fonts.sample')}
            </h3>
            {tagline ? <p className="text-muted">{tagline}</p> : null}
            <div className="h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
            <span className={buttonClasses('primary', 'md', 'w-full')} aria-hidden="true">
              {t('preview.button')}
            </span>
            <span className={buttonClasses('secondary', 'md', 'w-full')} aria-hidden="true">
              {t('preview.secondary')}
            </span>
          </div>
        </div>
      </Card>

      <ConfirmSheet
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        tone="danger"
        title={t('logo.removeTitle')}
        consequence={<p>{t('logo.removeBody')}</p>}
        confirmLabel={t('logo.remove')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}

/** A native colour picker next to a hex field, with a plain-language readability line. */
function ColourField({
  label,
  pick,
  value,
  onChange,
  fallback,
  error,
  hint,
  bad,
  testId,
}: {
  label: string;
  pick: string;
  value: string;
  onChange: (v: string) => void;
  fallback: string;
  error?: string;
  hint?: string;
  bad: boolean;
  testId: string;
}) {
  const shown = normalizeHex(value) ?? fallback;
  return (
    <div className="flex items-end gap-2">
      <TextField
        wrapperClassName="flex-1"
        label={label}
        value={value}
        placeholder={fallback}
        autoComplete="off"
        spellCheck={false}
        error={error ?? (bad ? hint : undefined)}
        hint={bad ? undefined : hint}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      />
      <input
        type="color"
        aria-label={`${pick}: ${label}`}
        value={shown.toLowerCase()}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="mb-[1.6rem] h-12 w-14 shrink-0 cursor-pointer rounded-input border border-border bg-surface p-1"
      />
    </div>
  );
}
