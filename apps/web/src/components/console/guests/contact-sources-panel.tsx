'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Cloud, FileUp, Globe, Lock, Smartphone } from 'lucide-react';
import { Banner } from '@/components/ui/display';
import { Button } from '@/components/ui/button';
import { FilePicker } from '@/components/ui/form';

export type SourceKind = 'phone' | 'google' | 'icloud' | 'other';

interface Props {
  /** True when the browser exposes the Contact Picker API (Android Chrome). */
  nativeAvailable: boolean;
  /** OAuth client ID present → in-place Google sign-in; null → vCard upload instructions. */
  googleId: string | null;
  /** True while a direct source call is in flight. */
  reading: boolean;
  /** Error banner text, or null. */
  error: string | null;
  onPickNative: () => void;
  onPickGoogle: () => void;
  onFile: (f: File) => void;
}

/**
 * The sources picker used by {@link ContactsSheet} (bulk import) and {@link ContactsPrefillSheet}
 * (single-pick on the Add Guest form). Shows Google / iCloud / Phone contacts / Other as explicit
 * options regardless of the browser or configuration: each one either triggers its direct API or
 * opens an in-sheet export-and-upload help panel (ADR 051).
 */
export function ContactSourcesPanel({
  nativeAvailable,
  googleId,
  reading,
  error,
  onPickNative,
  onPickGoogle,
  onFile,
}: Props) {
  const tk = useTranslations('contacts');
  const [helpFor, setHelpFor] = useState<SourceKind | null>(null);

  if (helpFor) {
    return (
      <div className="flex flex-col gap-3" data-testid={`contacts-help-${helpFor}`}>
        <button
          type="button"
          onClick={() => setHelpFor(null)}
          className="inline-flex min-h-10 items-center gap-1.5 self-start text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {tk('back')}
        </button>
        <h3 className="text-base font-semibold">{tk(`sources.${helpFor}.label`)}</h3>
        <p className="whitespace-pre-line text-sm text-muted">{tk(`sources.${helpFor}.steps`)}</p>
        <FilePicker
          label={tk(`sources.${helpFor}.upload`)}
          hint={tk('fileHelp')}
          accept=".vcf,.vcard,text/vcard,text/x-vcard,.csv,text/csv"
          buttonLabel={tk('chooseFile')}
          onFile={(f) => {
            onFile(f);
          }}
        />
      </div>
    );
  }

  // Only sources with a direct API have a `help` string (icloud/other are always fallback-only), so
  // look it up per-kind rather than templating the key.
  const directHelp = (kind: SourceKind): string => {
    switch (kind) {
      case 'phone':
        return tk('sources.phone.help');
      case 'google':
        return tk('sources.google.help');
      default:
        return tk(`sources.${kind}.fallbackHelp`);
    }
  };

  const Row = ({
    kind,
    icon,
    direct,
    testId,
  }: {
    kind: SourceKind;
    icon: React.ReactNode;
    /** When present the source button triggers a direct API; otherwise it opens the help panel. */
    direct?: () => void;
    testId?: string;
  }) => (
    <div className="flex flex-col gap-1">
      <Button
        block
        variant="secondary"
        icon={icon}
        loading={kind === 'google' && reading}
        onClick={direct ?? (() => setHelpFor(kind))}
        data-testid={testId ?? `contacts-source-${kind}`}
      >
        {tk(`sources.${kind}.label`)}
      </Button>
      <p className="text-sm text-muted">
        {direct ? directHelp(kind) : tk(`sources.${kind}.fallbackHelp`)}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4" data-testid="contacts-sources">
      <p className="flex items-start gap-2 text-sm text-muted">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {tk('privacy')}
      </p>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Row
        kind="phone"
        icon={<Smartphone className="size-5" aria-hidden="true" />}
        direct={nativeAvailable ? onPickNative : undefined}
      />
      <Row
        kind="google"
        icon={<Globe className="size-5" aria-hidden="true" />}
        direct={googleId ? onPickGoogle : undefined}
        testId="contacts-google"
      />
      <Row kind="icloud" icon={<Cloud className="size-5" aria-hidden="true" />} />
      <Row kind="other" icon={<FileUp className="size-5" aria-hidden="true" />} />
    </div>
  );
}
