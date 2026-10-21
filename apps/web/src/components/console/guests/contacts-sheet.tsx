'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldAlert } from 'lucide-react';
import type { CardKind } from '@harusi/schemas';
import { parsePhone, usePhoneCountry } from '@/lib/country';
import { BottomSheet } from '@/components/ui/overlay';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/display';
import { useToast } from '@/components/ui/toast';
import { getRepository, newIdempotencyKey } from '@/lib/repo';
import { formatPhone } from '@/lib/format';

interface Contact {
  name: string;
  tel: string;
}

const MOCK_CONTACTS: Contact[] = [
  { name: 'Shangazi Mwanaidi', tel: '0713 220 118' },
  { name: 'Kaka Salum', tel: '+255 754 330 912' },
  { name: 'Rafiki Pendo', tel: '0688 441 207' },
  { name: 'Mjomba Erasto', tel: '0765 902 334' },
  { name: 'Dada Faraja', tel: '0621 778 019' },
  { name: 'Mwalimu Grace', tel: '0717 004 552' },
];

interface ContactsManager {
  select: (
    props: string[],
    opts: { multiple: boolean },
  ) => Promise<{ name?: string[]; tel?: string[] }[]>;
}

/**
 * "Kutoka kwenye anwani": uses the Contact Picker API on Android Chrome; elsewhere a mock list.
 * Permission refusal shows the §17.10 permission-denied state with a non-contacts alternative.
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
  const ts = useTranslations('states');
  const tc = useTranslations('common');
  const toast = useToast();
  const country = usePhoneCountry();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { contacts?: ContactsManager })
      : null;
  const native = !!nav?.contacts;

  const pickNative = async () => {
    try {
      const res = await nav!.contacts!.select(['name', 'tel'], { multiple: true });
      setContacts(
        res.map((c) => ({ name: c.name?.[0] ?? '', tel: c.tel?.[0] ?? '' })).filter((c) => c.name),
      );
      setPicked(new Set(res.map((_, i) => i)));
    } catch {
      setDenied(true);
    }
  };

  const list = contacts ?? (native ? [] : MOCK_CONTACTS);
  const add = async () => {
    setBusy(true);
    try {
      const rows = [...picked]
        .map((i) => list[i]!)
        .map((c) => {
          const p = parsePhone(c.tel, country);
          return {
            displayName: c.name,
            phoneRaw: c.tel,
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
      setPicked(new Set());
    } catch {
      toast({ tone: 'error', title: ts('errorTitle') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('contactsTitle')}
      closeLabel={tc('close')}
      footer={
        !denied ? (
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
      ) : (
        <>
          {native && !contacts ? (
            <Button block onClick={pickNative}>
              {t('addContacts')}
            </Button>
          ) : null}
          {!native ? (
            <Banner tone="info" className="mb-3">
              {t('contactsMock')}
            </Banner>
          ) : null}
          <ul className="flex flex-col divide-y divide-border">
            {list.map((c, i) => {
              const p = parsePhone(c.tel, country);
              return (
                <li key={`${c.name}-${i}`}>
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      className="size-6 accent-[var(--hp-primary)]"
                      checked={picked.has(i)}
                      onChange={() =>
                        setPicked((s) => {
                          const n = new Set(s);
                          if (n.has(i)) n.delete(i);
                          else n.add(i);
                          return n;
                        })
                      }
                    />
                    <span className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-sm text-muted">
                        {p.ok ? formatPhone(p.e164) : c.tel}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </BottomSheet>
  );
}
