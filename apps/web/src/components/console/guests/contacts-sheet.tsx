'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileUp, Lock, ShieldAlert, Smartphone } from 'lucide-react';
import {
  CONTACTS_FILE_MAX_BYTES,
  cleanContacts,
  fromGoogleContactsCsv,
  isGoogleContactsCsv,
  parseCsv,
  parseVCard,
  type CardKind,
  type ContactLite,
} from '@harusi/schemas';
import { parsePhone, usePhoneCountry } from '@/lib/country';
import { BottomSheet } from '@/components/ui/overlay';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/display';
import { FilePicker, TextField } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { getRepository, newIdempotencyKey } from '@/lib/repo';
import { USE_MOCKS } from '@/lib/env';
import { formatPhone } from '@/lib/format';
import {
  GoogleContactsError,
  googleContactsClientId,
  loadGis,
  pickGoogleContacts,
} from '@/lib/google-contacts';

const MOCK_CONTACTS: ContactLite[] = [
  { name: 'Shangazi Mwanaidi', phone: '0713 220 118' },
  { name: 'Kaka Salum', phone: '+255 754 330 912' },
  { name: 'Rafiki Pendo', phone: '0688 441 207' },
  { name: 'Mjomba Erasto', phone: '0765 902 334' },
  { name: 'Dada Faraja', phone: '0621 778 019' },
  { name: 'Mwalimu Grace', phone: '0717 004 552' },
];

interface ContactsManager {
  select: (
    props: string[],
    opts: { multiple: boolean },
  ) => Promise<{ name?: string[]; tel?: string[] }[]>;
}

/** A `.vcf` export, or a Google Contacts CSV. Read in memory; nothing is uploaded. */
export async function readContactsFile(
  f: File,
): Promise<ContactLite[] | 'too_large' | 'unreadable'> {
  if (f.size > CONTACTS_FILE_MAX_BYTES) return 'too_large';
  const text = await f.text();
  if (text.includes('\u0000')) return 'unreadable';
  if (/BEGIN:VCARD/i.test(text)) return parseVCard(text);
  const rows = parseCsv(text);
  if (rows[0] && isGoogleContactsCsv(rows[0])) return fromGoogleContactsCsv(rows);
  return 'unreadable';
}

/**
 * "Kutoka kwenye anwani" (ADR 051): the phone's own picker (Contact Picker API, Android Chrome), Google
 * Contacts (read-only token in the browser, revoked after reading) or a contacts file (iPhone/iCloud
 * vCard, Google export). Contacts are read on this device; only the people picked are sent. Permission
 * refusal shows the §17.10 permission-denied state with a non-contacts alternative.
 */
export function ContactsSheet({
  eventId,
  open,
  onOpenChange,
  onImported,
  cardKind,
}: {
  eventId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
  /** What the people picked become: invitation cards (the default) or contribution cards (ADR 041). */
  cardKind?: CardKind;
}) {
  const t = useTranslations('guests');
  const tk = useTranslations('contacts');
  const ts = useTranslations('states');
  const tc = useTranslations('common');
  const toast = useToast();
  const country = usePhoneCountry();
  const [contacts, setContacts] = useState<ContactLite[] | null>(USE_MOCKS ? MOCK_CONTACTS : null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleId, setGoogleId] = useState<string | null>(null);
  const nav =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { contacts?: ContactsManager })
      : null;
  const native = !!nav?.contacts;

  // Google's script loads when the sheet opens, so the consent popup can open inside the tap.
  useEffect(() => {
    if (!open || USE_MOCKS) return;
    let live = true;
    void googleContactsClientId().then((id) => {
      if (!live || !id) return;
      loadGis().then(
        () => live && setGoogleId(id),
        () => undefined,
      );
    });
    return () => {
      live = false;
    };
  }, [open]);

  // Forget the address book when the sheet closes: nothing lingers in memory.
  useEffect(() => {
    if (open) return;
    setContacts(USE_MOCKS ? MOCK_CONTACTS : null);
    setPicked(new Set());
    setQuery('');
    setError(null);
    setDenied(false);
  }, [open]);

  const show = (list: ContactLite[], selectAll: boolean) => {
    const clean = cleanContacts(list);
    if (!clean.length) {
      setError(tk('empty'));
      return;
    }
    setError(null);
    setContacts(clean);
    setPicked(selectAll ? new Set(clean.map((_, i) => i)) : new Set());
  };

  const pickNative = async () => {
    try {
      const res = await nav!.contacts!.select(['name', 'tel'], { multiple: true });
      // the person already chose these in the phone's own picker
      show(
        res.map((c) => ({ name: c.name?.[0] ?? '', phone: c.tel?.[0] ?? '' })),
        true,
      );
    } catch {
      setDenied(true);
    }
  };

  const pickGoogle = async () => {
    if (!googleId || !window.google) return;
    setReading(true);
    setError(null);
    try {
      // a whole address book: nobody is preselected
      show(await pickGoogleContacts(window.google, googleId), false);
    } catch (e) {
      setError(
        e instanceof GoogleContactsError && e.code === 'denied'
          ? tk('googleDenied')
          : tk('googleFailed'),
      );
    } finally {
      setReading(false);
    }
  };

  const pickFile = async (f: File) => {
    setError(null);
    try {
      const r = await readContactsFile(f);
      if (r === 'too_large') setError(tk('tooLarge'));
      else if (r === 'unreadable') setError(tk('notContacts'));
      else show(r, false);
    } catch {
      setError(tk('notContacts'));
    }
  };

  const list = contacts ?? [];
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return list
      .map((c, i) => ({ c, i }))
      .filter(
        ({ c }) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)),
      );
  }, [list, query]);

  const add = async () => {
    setBusy(true);
    try {
      const rows = [...picked]
        .map((i) => list[i]!)
        .map((c) => {
          const p = parsePhone(c.phone, country);
          return {
            displayName: c.name,
            phoneRaw: c.phone,
            groupLabel: '',
            partySizeAllowed: 1,
            hasSmartphone: true,
            inviteChannelPref: p.ok ? ('whatsapp' as const) : ('print' as const),
          };
        });
      const r = await getRepository().importGuests(eventId, rows, newIdempotencyKey(), {
        cardKind,
      });
      toast({ tone: 'success', title: t('contactsAdded', { count: r.created }) });
      onImported();
      onOpenChange(false);
    } catch {
      toast({ tone: 'error', title: ts('errorTitle') });
    } finally {
      setBusy(false);
    }
  };

  const toggle = (i: number) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('contactsTitle')}
      closeLabel={tc('close')}
      footer={
        !denied && contacts ? (
          <Button onClick={add} disabled={!picked.size} loading={busy}>
            {t('contactsAdd', { count: picked.size })}
          </Button>
        ) : undefined
      }
    >
      {denied ? (
        <div
          className="flex flex-col items-center gap-3 py-6 text-center"
          data-testid="contacts-denied"
        >
          <ShieldAlert className="size-10 text-warning" aria-hidden="true" />
          <p className="font-semibold">{ts('permContacts')}</p>
          <p className="text-muted">{ts('permBody')}</p>
          <a
            href={`/app/e/${eventId}/guests/import`}
            className="inline-flex min-h-12 items-center rounded-input border border-border px-4 font-semibold"
          >
            {ts('useAlternative')}
          </a>
        </div>
      ) : !contacts ? (
        <div className="flex flex-col gap-4" data-testid="contacts-sources">
          <p className="flex items-start gap-2 text-sm text-muted">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {tk('privacy')}
          </p>
          {error ? <Banner tone="error">{error}</Banner> : null}
          {native ? (
            <div className="flex flex-col gap-1">
              <Button
                block
                icon={<Smartphone className="size-5" aria-hidden="true" />}
                onClick={pickNative}
              >
                {tk('thisPhone')}
              </Button>
              <p className="text-sm text-muted">{tk('thisPhoneHelp')}</p>
            </div>
          ) : null}
          {googleId ? (
            <div className="flex flex-col gap-1">
              <Button
                block
                variant="secondary"
                loading={reading}
                onClick={pickGoogle}
                data-testid="contacts-google"
              >
                {tk('google')}
              </Button>
              <p className="text-sm text-muted">{tk('googleHelp')}</p>
            </div>
          ) : null}
          <FilePicker
            label={tk('file')}
            hint={tk('fileHelp')}
            accept=".vcf,.vcard,text/vcard,text/x-vcard,.csv,text/csv"
            buttonLabel={tk('chooseFile')}
            onFile={pickFile}
          />
        </div>
      ) : (
        <>
          {contacts === MOCK_CONTACTS ? (
            <Banner tone="info" className="mb-3">
              {t('contactsMock')}
            </Banner>
          ) : null}
          <div className="mb-2 flex flex-col gap-2">
            {list.length > 8 ? (
              <TextField
                label={tk('search')}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted" aria-live="polite">
                {tk('selected', { count: picked.size })}
              </span>
              <span className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPicked((s) => new Set([...s, ...visible.map(({ i }) => i)]))}
                >
                  {tk('selectAll', { count: visible.length })}
                </Button>
                {picked.size ? (
                  <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
                    {tk('selectNone')}
                  </Button>
                ) : null}
              </span>
            </div>
          </div>
          {visible.length === 0 ? (
            <p className="py-6 text-center text-muted">{tk('noMatch')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {visible.map(({ c, i }) => {
                const p = parsePhone(c.phone, country);
                return (
                  <li key={`${c.name}-${i}`}>
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        className="size-6 accent-[var(--hp-primary)]"
                        checked={picked.has(i)}
                        onChange={() => toggle(i)}
                      />
                      <span className="flex flex-col">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-sm text-muted">
                          {p.ok ? formatPhone(p.e164) : c.phone || t('noPhone')}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            icon={<FileUp className="size-4" aria-hidden="true" />}
            onClick={() => {
              setContacts(null);
              setPicked(new Set());
              setQuery('');
            }}
          >
            {tk('another')}
          </Button>
        </>
      )}
    </BottomSheet>
  );
}
