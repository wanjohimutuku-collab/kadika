'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldAlert } from 'lucide-react';
import { cleanContacts, type ContactLite } from '@harusi/schemas';
import { usePhoneCountry, parsePhone } from '@/lib/country';
import { BottomSheet } from '@/components/ui/overlay';
import { TextField } from '@/components/ui/form';
import { USE_MOCKS } from '@/lib/env';
import { formatPhone } from '@/lib/format';
import {
  GoogleContactsError,
  googleContactsClientId,
  loadGis,
  pickGoogleContacts,
} from '@/lib/google-contacts';
import { readContactsFile } from './contacts-sheet';
import { ContactSourcesPanel } from './contact-sources-panel';

interface ContactsManager {
  select: (
    props: string[],
    opts: { multiple: boolean },
  ) => Promise<{ name?: string[]; tel?: string[] }[]>;
}

/**
 * Single-pick contacts sheet for the Add Guest form (ADR 051). Same three sources as the bulk
 * {@link ContactsSheet} — the phone's own picker, Google Contacts and a vCard/CSV file — but each row
 * is a button: tapping fires `onPick` and closes the sheet. Nothing is sent to the API.
 */
export function ContactsPrefillSheet({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (contact: ContactLite) => void;
}) {
  const t = useTranslations('guests');
  const tk = useTranslations('contacts');
  const ts = useTranslations('states');
  const tc = useTranslations('common');
  const tf = useTranslations('guestForm');
  const country = usePhoneCountry();
  const [contacts, setContacts] = useState<ContactLite[] | null>(null);
  const [query, setQuery] = useState('');
  const [denied, setDenied] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleId, setGoogleId] = useState<string | null>(null);
  const nav =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { contacts?: ContactsManager })
      : null;
  const native = !!nav?.contacts;

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

  useEffect(() => {
    if (open) return;
    setContacts(null);
    setQuery('');
    setError(null);
    setDenied(false);
  }, [open]);

  const show = (list: ContactLite[]) => {
    const clean = cleanContacts(list);
    if (!clean.length) {
      setError(tk('empty'));
      return;
    }
    setError(null);
    setContacts(clean);
  };

  const pickNative = async () => {
    try {
      const res = await nav!.contacts!.select(['name', 'tel'], { multiple: true });
      show(res.map((c) => ({ name: c.name?.[0] ?? '', phone: c.tel?.[0] ?? '' })));
    } catch {
      setDenied(true);
    }
  };

  const pickGoogle = async () => {
    if (!googleId || !window.google) return;
    setReading(true);
    setError(null);
    try {
      show(await pickGoogleContacts(window.google, googleId));
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
      else show(r);
    } catch {
      setError(tk('notContacts'));
    }
  };

  const list = contacts ?? [];
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return list.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)),
    );
  }, [list, query]);

  const choose = (c: ContactLite) => {
    onPick(c);
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={tf('prefillTitle')}
      closeLabel={tc('close')}
    >
      {denied ? (
        <div
          className="flex flex-col items-center gap-3 py-6 text-center"
          data-testid="contacts-prefill-denied"
        >
          <ShieldAlert className="size-10 text-warning" aria-hidden="true" />
          <p className="font-semibold">{ts('permContacts')}</p>
          <p className="text-muted">{ts('permBody')}</p>
        </div>
      ) : !contacts ? (
        <ContactSourcesPanel
          nativeAvailable={native}
          googleId={googleId}
          reading={reading}
          error={error}
          onPickNative={pickNative}
          onPickGoogle={pickGoogle}
          onFile={pickFile}
        />
      ) : (
        <>
          {list.length > 8 ? (
            <TextField
              label={tk('search')}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          ) : null}
          {visible.length === 0 ? (
            <p className="py-6 text-center text-muted">{tk('noMatch')}</p>
          ) : (
            <ul
              className="flex flex-col divide-y divide-border"
              data-testid="contacts-prefill-list"
            >
              {visible.map((c, i) => {
                const p = parsePhone(c.phone, country);
                return (
                  <li key={`${c.name}-${i}`}>
                    <button
                      type="button"
                      onClick={() => choose(c)}
                      className="flex min-h-14 w-full items-center gap-3 py-2 text-left hover:bg-primary/5"
                    >
                      <span className="flex flex-col">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-sm text-muted">
                          {p.ok ? formatPhone(p.e164) : c.phone || t('noPhone')}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </BottomSheet>
  );
}
