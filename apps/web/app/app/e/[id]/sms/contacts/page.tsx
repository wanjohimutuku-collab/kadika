'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  ContactRound,
  Search,
  Send,
  Smartphone,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { Guest } from '@harusi/api-client';
import type { Country } from '@harusi/schemas/country';
import {
  buildPreview,
  guessMapping,
  parsePastedList,
  summarizePreview,
} from '@harusi/schemas/import';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { Button } from '@/components/ui/button';
import { Avatar, EmptyState, Skeleton } from '@/components/ui/display';
import { PhoneField, Textarea, TextField } from '@/components/ui/form';
import { BottomSheet, ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { usePhoneCountry } from '@/lib/country';
import { getRepository } from '@/lib/repo';
import { eventScopedKeys, useEvent } from '@/lib/queries';
import { formatPhone } from '@/lib/format';
import { cn } from '@/lib/cn';
import { savePicked, useContacts } from '@/components/sms/shared';
import { ContactsSheet } from '@/components/console/guests/contacts-sheet';

/**
 * Wapokeaji (ADR 055): the SMS-only customer's contact list. Contacts are the event's guests, kept to
 * a name, a number and an optional group; no card, RSVP or party size is ever shown.
 */
export default function SmsContactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('sms.contacts');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const event = useEvent(id);
  const country = usePhoneCountry();
  const contacts = useContacts(id);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const language = event.data?.languageDefault ?? 'sw';

  const refresh = () =>
    Promise.all(eventScopedKeys(id).map((k) => queryClient.invalidateQueries({ queryKey: k })));

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    return (contacts.data ?? []).filter(
      (g) =>
        !needle ||
        g.displayName.toLowerCase().includes(needle) ||
        g.groupLabel.toLowerCase().includes(needle) ||
        (digits.length >= 3 && (g.phoneE164 ?? '').includes(digits)),
    );
  }, [contacts.data, q]);

  const toggle = (gid: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(gid)) n.delete(gid);
      else n.add(gid);
      return n;
    });

  const remove = useMutation({
    mutationFn: (ids: string[]) => getRepository().deleteGuests(ids),
    onSuccess: async (r, ids) => {
      setConfirmDelete(false);
      setPicked(new Set());
      await refresh();
      toast({
        tone: 'success',
        title: t('deleted', { count: r.deleted }),
        action: {
          label: t('undo'),
          onClick: () => void getRepository().restoreGuests(ids).then(refresh),
        },
      });
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  const sendToPicked = () => {
    savePicked(id, [...picked]);
    router.push(`/app/e/${id}/sms/compose?to=picked`);
  };

  const withPhone = contacts.data?.filter((g) => g.phoneE164).length ?? 0;

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={
          contacts.data ? t('subtitle', { count: contacts.data.length, withPhone }) : undefined
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Smartphone className="size-5" aria-hidden="true" />}
              onClick={() => setImporting(true)}
              data-testid="sms-contacts-from-contacts"
            >
              {t('fromContacts')}
            </Button>
            <Button
              variant="secondary"
              icon={<ClipboardList className="size-5" aria-hidden="true" />}
              onClick={() => setPasting(true)}
            >
              {t('paste')}
            </Button>
            <Button
              icon={<UserPlus className="size-5" aria-hidden="true" />}
              onClick={() => setAdding(true)}
            >
              {t('add')}
            </Button>
          </>
        }
      />

      <QueryState
        query={contacts}
        skeleton={<Skeleton lines={8} />}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={<ContactRound className="size-7" />}
            title={t('empty')}
            action={<Button onClick={() => setPasting(true)}>{t('paste')}</Button>}
          />
        }
      >
        {() => (
          <div className="flex flex-col gap-3 pb-20">
            <TextField
              label={t('search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              prefix={<Search className="size-4" aria-hidden="true" />}
              type="search"
            />
            {shown.length === 0 ? (
              <p className="py-6 text-center text-muted">{t('noMatch')}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted">{t('showing', { count: shown.length })}</span>
                  {(() => {
                    const shownIds = shown.map((g) => g.id);
                    const allShownPicked =
                      shownIds.length > 0 && shownIds.every((id) => picked.has(id));
                    return (
                      <button
                        type="button"
                        className="min-h-9 rounded-full px-3 font-semibold text-primary hover:bg-primary/5"
                        onClick={() => {
                          setPicked((s) => {
                            const n = new Set(s);
                            if (allShownPicked) shownIds.forEach((id) => n.delete(id));
                            else shownIds.forEach((id) => n.add(id));
                            return n;
                          });
                        }}
                        data-testid="sms-select-all"
                      >
                        {allShownPicked ? t('selectNone') : t('selectAll')}
                      </button>
                    );
                  })()}
                </div>
                <ul
                  className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface"
                  data-testid="sms-contacts"
                >
                  {shown.map((g) => (
                    <ContactRow
                      key={g.id}
                      g={g}
                      home={country}
                      checked={picked.has(g.id)}
                      onToggle={() => toggle(g.id)}
                      label={t('select', { name: g.displayName })}
                      noPhone={t('noPhone')}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </QueryState>

      {picked.size > 0 ? (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface p-3 md:bottom-0 md:left-[248px]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
            <span className="mr-auto font-semibold">{t('selected', { count: picked.size })}</span>
            <Button
              variant="ghost"
              icon={<Trash2 className="size-5" aria-hidden="true" />}
              onClick={() => setConfirmDelete(true)}
            >
              {t('delete')}
            </Button>
            <Button icon={<Send className="size-5" aria-hidden="true" />} onClick={sendToPicked}>
              {t('sendToSelected')}
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmSheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('deleteTitle', { count: picked.size })}
        consequence={t('deleteConsequence')}
        confirmLabel={t('delete')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={remove.isPending}
        onConfirm={() => remove.mutate([...picked])}
      />

      <AddContactSheet
        open={adding}
        onOpenChange={setAdding}
        eventId={id}
        language={language}
        onSaved={refresh}
      />
      <PasteSheet
        open={pasting}
        onOpenChange={setPasting}
        eventId={id}
        existing={contacts.data ?? []}
        onSaved={refresh}
      />
      <ContactsSheet
        eventId={id}
        open={importing}
        onOpenChange={setImporting}
        onImported={() => void refresh()}
        channel="sms"
      />
    </>
  );
}

function ContactRow({
  g,
  home,
  checked,
  onToggle,
  label,
  noPhone,
}: {
  g: Guest;
  home: Country;
  checked: boolean;
  onToggle: () => void;
  label: string;
  noPhone: string;
}) {
  return (
    <li>
      <label
        className={cn(
          'flex min-h-16 cursor-pointer items-center gap-3 px-3 py-2',
          checked && 'bg-primary/5',
        )}
      >
        <input
          type="checkbox"
          className="size-5 accent-[var(--hp-primary)]"
          checked={checked}
          onChange={onToggle}
          aria-label={label}
        />
        <Avatar name={g.displayName} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{g.displayName}</span>
          <span className={cn('block text-sm', g.phoneE164 ? 'text-muted' : 'text-warning')}>
            {g.phoneE164 ? formatPhone(g.phoneE164, home) : noPhone}
          </span>
        </span>
        {g.groupLabel ? (
          <span className="shrink-0 rounded-full border border-border bg-bg px-2.5 py-0.5 text-sm">
            {g.groupLabel}
          </span>
        ) : null}
      </label>
    </li>
  );
}

function AddContactSheet({
  open,
  onOpenChange,
  eventId,
  language,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  eventId: string;
  language: 'sw' | 'en';
  onSaved: () => Promise<unknown>;
}) {
  const t = useTranslations('sms.contacts');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [e164, setE164] = useState<string | null>(null);
  const [group, setGroup] = useState('');
  const save = useMutation({
    mutationFn: () =>
      getRepository().createGuest(eventId, {
        displayName: name.trim(),
        phone: e164 ?? '',
        groupLabel: group.trim(),
        partySizeAllowed: 1,
        inviteChannelPref: 'sms',
        hasSmartphone: false,
        printCard: false,
        language,
      }),
    onSuccess: async (g) => {
      toast({ tone: 'success', title: t('saved', { name: g.displayName }) });
      setName('');
      setPhone('');
      setE164(null);
      await onSaved();
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('add')}
      closeLabel={tc('close')}
      footer={
        <Button
          className="w-full"
          disabled={name.trim().length < 2 || !e164}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          {t('save')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField
          label={t('name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <PhoneField label={t('phone')} value={phone} onChange={setPhone} onE164={setE164} />
        <TextField
          label={t('group')}
          hint={t('groupHint')}
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        />
      </div>
    </BottomSheet>
  );
}

function PasteSheet({
  open,
  onOpenChange,
  eventId,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  eventId: string;
  existing: Guest[];
  onSaved: () => Promise<unknown>;
}) {
  const t = useTranslations('sms.contacts');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const toast = useToast();
  const [text, setText] = useState('');
  const [group, setGroup] = useState('');
  const rows = useMemo(() => {
    const parsed = parsePastedList(text);
    if (!parsed.length) return [];
    const { mapping, hasHeader } = guessMapping(parsed[0]!);
    return buildPreview(parsed, mapping, {
      hasHeader,
      existingPhones: existing.map((g) => g.phoneE164).filter((p): p is string => !!p),
      existingNames: existing.map((g) => g.displayName),
      defaultGroup: group.trim(),
    });
  }, [text, group, existing]);
  const summary = summarizePreview(rows);
  const ready = rows.filter((r) => r.include && r.phoneE164);
  const save = useMutation({
    mutationFn: () =>
      getRepository().importGuests(
        eventId,
        ready.map((r) => ({
          displayName: r.displayName,
          phoneRaw: r.phoneE164 ?? r.phoneRaw,
          groupLabel: r.groupLabel,
          partySizeAllowed: 1,
          hasSmartphone: false,
          inviteChannelPref: 'sms',
        })),
        crypto.randomUUID(),
      ),
    onSuccess: async (r) => {
      toast({ tone: 'success', title: t('pasteDone', { count: r.created }) });
      setText('');
      onOpenChange(false);
      await onSaved();
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('pasteTitle')}
      description={t('pasteHint')}
      closeLabel={tc('close')}
      footer={
        <Button
          className="w-full"
          disabled={ready.length === 0}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          {t('pasteSave', { count: ready.length })}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Textarea
          label={t('pasteLabel')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={'Juma Ali 0712 345 678\nAsha Mussa, 0754 111 222'}
        />
        <TextField
          label={t('pasteGroup')}
          hint={t('groupHint')}
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        />
        {rows.length ? (
          <p className="text-sm text-muted" role="status" data-testid="paste-summary">
            {t('pasteSummary', {
              ok: ready.length,
              noPhone: rows.filter((r) => r.include && !r.phoneE164).length,
              invalid: summary.invalid,
              duplicate: summary.duplicates,
            })}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}
