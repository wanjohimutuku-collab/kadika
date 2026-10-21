'use client';

import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
} from '@tanstack/react-table';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDownUp,
  BookmarkPlus,
  ContactRound,
  Download,
  FileUp,
  Pencil,
  Printer,
  CheckSquare,
  RefreshCw,
  Search,
  Send,
  Tags,
  WalletCards,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  applyGuestQuery,
  filterCounts,
  GUEST_FILTERS,
  type Guest,
  type GuestFilter,
  type GuestQuery,
} from '@harusi/api-client';
import { CARD_KINDS, type CardKind } from '@harusi/schemas';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { ChannelIcon, GuestStatusPill } from '@/components/console/status';
import { GuestForm } from '@/components/console/guests/guest-form';
import { ContactsSheet } from '@/components/console/guests/contacts-sheet';
import { Button, IconButton } from '@/components/ui/button';
import { Avatar, Chip, EmptyState, Skeleton, StatusPill } from '@/components/ui/display';
import { ListRow } from '@/components/ui/data';
import { BottomSheet, ConfirmSheet } from '@/components/ui/overlay';
import { TextField } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { getRepository, newIdempotencyKey } from '@/lib/repo';
import { eventScopedKeys, qk } from '@/lib/queries';
import { formatPhone, formatMoney } from '@/lib/format';
import { useCurrency } from '@/lib/country';
import { downloadBlob, SELECTED_GUESTS_KEY as SELECTED_KEY } from '@/lib/download';
import { cn } from '@/lib/cn';
import { useQuotaToast } from '@/components/console/quota';

type SortBy = NonNullable<GuestQuery['sort']>['by'];
interface SavedFilter {
  name: string;
  filter: GuestFilter;
  group: string;
  search: string;
}

const savedKey = (id: string) => `harusi.guestFilters.${id}`;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function GuestsInner({ id }: { id: string }) {
  const cur = useCurrency();
  const t = useTranslations('guests');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const tf = useTranslations('guestForm');
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const quota = useQuotaToast(id);
  const queryClient = useQueryClient();
  const guests = useQuery({
    queryKey: qk.guests(id),
    queryFn: () => getRepository().listGuests(id),
  });
  const groups = useQuery({
    queryKey: qk.groups(id),
    queryFn: () => getRepository().listGroups(id),
  });

  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 150);
  const [filter, setFilter] = useState<GuestFilter>(
    (GUEST_FILTERS as string[]).includes(params.get('filter') ?? '')
      ? (params.get('filter') as GuestFilter)
      : 'all',
  );
  // which cards to list: everyone, or only invitation or contribution cards (ADR 041)
  const [cardKind, setCardKind] = useState<'all' | CardKind>(
    (CARD_KINDS as readonly string[]).includes(params.get('card') ?? '')
      ? (params.get('card') as CardKind)
      : 'all',
  );
  const [group, setGroup] = useState('');
  const [sort, setSort] = useState<{ by: SortBy; dir: 'asc' | 'desc' }>({ by: 'name', dir: 'asc' });
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [selectMode, setSelectMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [cardKindOpen, setCardKindOpen] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saved, setSaved] = useState<SavedFilter[]>([]);

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(savedKey(id)) ?? '[]') as SavedFilter[]);
    } catch {
      setSaved([]);
    }
  }, [id]);
  const persistSaved = (list: SavedFilter[]) => {
    setSaved(list);
    try {
      localStorage.setItem(savedKey(id), JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const all = useMemo(() => guests.data ?? [], [guests.data]);
  const contributionTotal = useMemo(
    () => all.filter((g) => g.cardKind === 'contribution').length,
    [all],
  );
  const ofKind = useMemo(
    () => (cardKind === 'all' ? all : all.filter((g) => g.cardKind === cardKind)),
    [all, cardKind],
  );
  const counts = useMemo(() => filterCounts(ofKind), [ofKind]);
  const rows = useMemo(
    () =>
      applyGuestQuery(all, {
        search: debounced,
        filter,
        group: group || undefined,
        sort,
        cardKind: cardKind === 'all' ? undefined : cardKind,
      }),
    [all, debounced, filter, group, sort, cardKind],
  );
  const selectedIds = Object.keys(selection).filter((k) => selection[k]);
  const anySelected = selectedIds.length > 0;

  const invalidate = () =>
    Promise.all(eventScopedKeys(id).map((k) => queryClient.invalidateQueries({ queryKey: k })));

  const resend = useMutation({
    mutationFn: (guestIds: string[]) =>
      getRepository().sendInvitations(id, {
        audience: { kind: 'selected', guestIds },
        channel: 'auto',
        whatsappFallbackToSms: true,
        scheduleAt: null,
        kind: 'invite',
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: (job) => {
      toast({ tone: 'success', title: `${t('resend')} · ${job.total}` });
      setTimeout(() => void invalidate(), 4000);
    },
    onError: (e) => quota(e) || toast({ tone: 'error', title: ts('errorTitle') }),
  });

  const del = useMutation({
    mutationFn: (ids: string[]) => getRepository().deleteGuests(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: qk.guests(id) });
      const prev = queryClient.getQueryData<Guest[]>(qk.guests(id));
      queryClient.setQueryData<Guest[]>(qk.guests(id), (l) =>
        l?.filter((g) => !ids.includes(g.id)),
      );
      return { prev };
    },
    onError: (_e, _ids, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(qk.guests(id), ctx.prev);
      toast({ tone: 'error', title: ts('rolledBack') });
    },
    onSuccess: (r, ids) => {
      setSelection({});
      setDeleteOpen(false);
      toast({
        tone: 'info',
        title: t('deleted', { count: r.deleted }),
        action: {
          label: tc('undo'),
          onClick: () => void getRepository().restoreGuests(ids).then(invalidate),
        },
      });
      void invalidate();
    },
  });

  const regroup = useMutation({
    mutationFn: ({ ids, g }: { ids: string[]; g: string }) =>
      getRepository().setGuestsGroup(ids, g),
    onSuccess: () => {
      toast({ tone: 'success', title: t('groupUpdated') });
      setGroupOpen(false);
      setSelection({});
      void invalidate();
    },
    onError: () => toast({ tone: 'error', title: ts('rolledBack') }),
  });

  const recard = useMutation({
    mutationFn: async ({ ids, kind }: { ids: string[]; kind: CardKind }) => {
      for (const gid of ids) await getRepository().updateGuest(gid, { cardKind: kind });
      return ids.length;
    },
    onSuccess: (n) => {
      toast({ tone: 'success', title: t('cardKindUpdated', { count: n }) });
      setCardKindOpen(false);
      setSelection({});
      setSelectMode(false);
      void invalidate();
    },
    onError: () => toast({ tone: 'error', title: ts('rolledBack') }),
  });

  const print = useMutation({
    mutationFn: (ids: string[]) =>
      getRepository().requestCardsPdf(id, { format: 'A6', layout: 'single', guestIds: ids }),
    onSuccess: (blob, ids) => {
      downloadBlob(blob, `kadi-${ids.length}.pdf`);
      toast({ tone: 'success', title: t('printQueued', { count: ids.length }) });
      void invalidate(); // the cards are generated now (ADR 042)
    },
    onError: (e) => quota(e) || toast({ tone: 'error', title: ts('errorTitle') }),
  });

  // ADR 042: choose who gets a printed card; generating them happens on Kadi (or "Chapisha" here).
  const markPrint = useMutation({
    mutationFn: ({ ids, on }: { ids: string[]; on: boolean }) =>
      getRepository().setPrintCard(id, ids, on),
    onSuccess: (r, v) => {
      toast({
        tone: 'success',
        title: t(v.on ? 'printMarked' : 'printUnmarked', { count: r.updated }),
      });
      setSelection({});
      setSelectMode(false);
      void invalidate();
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  const exportCsv = useMutation({
    mutationFn: () => getRepository().exportCsv(id, 'guests'),
    onSuccess: (blob) => downloadBlob(blob, 'wageni.csv'),
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  const goSendSelected = () => {
    sessionStorage.setItem(SELECTED_KEY, JSON.stringify(selectedIds));
    const chosen = all.filter((g) => selection[g.id]);
    const onlyContribution =
      chosen.length > 0 && chosen.every((g) => g.cardKind === 'contribution');
    router.push(
      `/app/e/${id}/send?audience=selected${onlyContribution ? '&card=contribution' : ''}`,
    );
  };

  const toggleSort = (by: SortBy) =>
    setSort((s) => ({ by, dir: s.by === by && s.dir === 'asc' ? 'desc' : 'asc' }));

  const col = createColumnHelper<Guest>();
  const columns = [
    col.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="size-5 accent-[var(--hp-primary)]"
          aria-label={t('selectAll')}
          checked={table.getIsAllRowsSelected()}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomeRowsSelected();
          }}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="size-5 accent-[var(--hp-primary)]"
          aria-label={t('selectRow', { name: row.original.displayName })}
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    }),
    col.accessor('displayName', {
      header: t('col.name'),
      cell: (c) => (
        <Link
          href={`/app/e/${id}/guests/${c.row.original.id}`}
          className="flex items-center gap-2 font-medium hover:underline"
        >
          <Avatar name={c.getValue()} size={32} />
          <span className="truncate">{c.getValue()}</span>
          {c.row.original.cardKind === 'contribution' ? (
            <StatusPill tone="info">{t('cardKindContribution')}</StatusPill>
          ) : null}
        </Link>
      ),
    }),
    col.accessor('phoneE164', {
      header: t('col.phone'),
      cell: (c) => (
        <span className="tabular whitespace-nowrap">
          {c.getValue() ? (
            formatPhone(c.getValue())
          ) : (
            <span className="text-muted">{t('noPhone')}</span>
          )}
        </span>
      ),
    }),
    col.accessor('groupLabel', {
      header: t('col.group'),
      cell: (c) => <span className="truncate">{c.getValue() || '—'}</span>,
    }),
    col.accessor('partySizeAllowed', {
      header: t('col.party'),
      cell: (c) => (
        <span className="tabular">
          {c.row.original.rsvpPartySize
            ? `${c.row.original.rsvpPartySize}/${c.getValue()}`
            : c.getValue()}
        </span>
      ),
    }),
    col.accessor('shortCode', {
      header: t('col.code'),
      cell: (c) => <span className="font-mono whitespace-nowrap">{c.getValue()}</span>,
    }),
    col.accessor('status', {
      header: t('col.status'),
      cell: (c) => <GuestStatusPill guest={c.row.original} />,
    }),
    col.accessor('channelLast', {
      header: t('col.channel'),
      cell: (c) => (
        <ChannelIcon
          channel={
            c.getValue() ??
            (c.row.original.inviteChannelPref === 'mixed'
              ? 'whatsapp'
              : c.row.original.inviteChannelPref)
          }
        />
      ),
    }),
    col.display({
      id: 'balance',
      header: t('col.balance'),
      cell: (c) => (
        <span className="tabular whitespace-nowrap">
          {c.row.original.pledge ? formatMoney(c.row.original.pledge.balance, cur) : '—'}
        </span>
      ),
    }),
  ];
  const sortable: Partial<Record<string, SortBy>> = {
    displayName: 'name',
    groupLabel: 'group',
    status: 'status',
    balance: 'balance',
  };

  const table = useReactTable({
    data: rows,
    columns,
    state: { rowSelection: selection },
    getRowId: (g) => g.id,
    enableRowSelection: true,
    onRowSelectionChange: setSelection,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 64,
    overscan: 12,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });
  const items = virtualizer.getVirtualItems();
  const padTop = items[0] ? items[0].start - virtualizer.options.scrollMargin : 0;
  const padBottom = items.length
    ? virtualizer.getTotalSize() - (items[items.length - 1]!.end - virtualizer.options.scrollMargin)
    : 0;

  const filtersActive = filter !== 'all' || !!group || !!debounced;

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={guests.data ? t('count', { shown: rows.length, total: all.length }) : undefined}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="size-4" aria-hidden="true" />}
              onClick={() => exportCsv.mutate()}
              loading={exportCsv.isPending}
            >
              {t('export')}
            </Button>
            <Button
              size="sm"
              icon={<UserPlus className="size-4" aria-hidden="true" />}
              onClick={() => setAddOpen(true)}
              data-testid="add-guest"
            >
              {t('add')}
            </Button>
          </>
        }
      />

      <div className="sticky top-16 z-20 -mx-4 flex flex-col gap-3 border-b border-border bg-bg/95 px-4 pt-1 pb-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
        <label className="relative block">
          <span className="sr-only">{t('searchLabel')}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchLabel')}
            className="min-h-12 w-full rounded-input border border-border bg-surface pr-3 pl-10 text-base"
            data-testid="guest-search"
          />
        </label>
        {contributionTotal > 0 || cardKind !== 'all' ? (
          <div
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
            role="group"
            aria-label={t('cardTypeLabel')}
            data-testid="card-kind-filter"
          >
            {(['all', ...CARD_KINDS] as const).map((k) => (
              <Chip
                key={k}
                pressed={cardKind === k}
                onClick={() => setCardKind(k)}
                count={
                  k === 'all'
                    ? all.length
                    : k === 'contribution'
                      ? contributionTotal
                      : all.length - contributionTotal
                }
              >
                {t(`cardTypes.${k}`)}
              </Chip>
            ))}
          </div>
        ) : null}
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
          role="group"
          aria-label={t('filtersLabel')}
        >
          {GUEST_FILTERS.map((f) => (
            <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)} count={counts[f]}>
              {t(`filters.${f}`)}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none">
            <span className="sr-only">{t('group')}</span>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="min-h-11 w-full min-w-0 rounded-input border border-border bg-surface px-2 text-sm sm:w-auto"
            >
              <option value="">{t('allGroups')}</option>
              {(groups.data ?? []).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none md:hidden">
            <ArrowDownUp className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="sr-only">{t('sort')}</span>
            <select
              value={sort.by}
              onChange={(e) => setSort({ by: e.target.value as SortBy, dir: 'asc' })}
              className="min-h-11 w-full min-w-0 rounded-input border border-border bg-surface px-2 text-sm"
            >
              {(['name', 'status', 'group', 'updated', 'balance'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`sorts.${s}`)}
                </option>
              ))}
            </select>
          </label>
          {filtersActive ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                icon={<BookmarkPlus className="size-4" aria-hidden="true" />}
                onClick={() => setSaveOpen(true)}
              >
                {t('saveFilter')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilter('all');
                  setGroup('');
                  setSearch('');
                }}
              >
                {t('clearFilters')}
              </Button>
            </>
          ) : null}
          {saved.map((sf) => (
            <span
              key={sf.name}
              className="inline-flex items-center rounded-full border border-border bg-surface"
            >
              <button
                type="button"
                className="min-h-10 px-3 text-sm font-medium"
                onClick={() => {
                  setFilter(sf.filter);
                  setGroup(sf.group);
                  setSearch(sf.search);
                }}
              >
                {sf.name}
              </button>
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-full hover:bg-ink/6"
                aria-label={t('removeFilter', { name: sf.name })}
                onClick={() => persistSaved(saved.filter((x) => x.name !== sf.name))}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <QueryState
        query={guests}
        skeleton={
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        }
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={<Users className="size-7" />}
            title={t('empty')}
            action={
              <Link
                href={`/app/e/${id}/guests/import`}
                className="inline-flex min-h-12 items-center rounded-input bg-primary px-4 font-semibold text-on-primary"
              >
                {t('addImport')}
              </Link>
            }
          />
        }
      >
        {() =>
          rows.length === 0 ? (
            <EmptyState
              icon={<Search className="size-7" />}
              title={t('emptyFiltered')}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFilter('all');
                    setGroup('');
                    setSearch('');
                  }}
                >
                  {t('clearFilters')}
                </Button>
              }
            />
          ) : (
            <div ref={listRef} className="mt-3" data-testid="guest-list">
              {/* Desktop table */}
              <div
                className="hidden overflow-x-auto rounded-card border border-border bg-surface md:block"
                role="region"
                aria-label={t('title')}
                tabIndex={0}
              >
                <table className="w-full min-w-[820px] border-collapse text-left">
                  <thead className="border-b border-border bg-bg text-sm text-muted">
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id}>
                        {hg.headers.map((h) => {
                          const sb = sortable[h.column.id];
                          const active = sb && sort.by === sb;
                          return (
                            <th
                              key={h.id}
                              scope="col"
                              className="px-2.5 py-2 font-semibold whitespace-nowrap"
                              aria-sort={
                                active
                                  ? sort.dir === 'asc'
                                    ? 'ascending'
                                    : 'descending'
                                  : undefined
                              }
                            >
                              {sb ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSort(sb)}
                                  className="inline-flex min-h-10 items-center gap-1 hover:text-ink"
                                >
                                  {flexRender(h.column.columnDef.header, h.getContext())}
                                  <ArrowDownUp
                                    className={cn(
                                      'size-3.5',
                                      active ? 'text-primary' : 'opacity-40',
                                    )}
                                    aria-hidden="true"
                                  />
                                </button>
                              ) : (
                                flexRender(h.column.columnDef.header, h.getContext())
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {padTop > 0 ? (
                      <tr aria-hidden="true">
                        <td style={{ height: padTop }} colSpan={columns.length} />
                      </tr>
                    ) : null}
                    {items.map((vi) => {
                      const row = table.getRowModel().rows[vi.index]!;
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            'h-16 border-b border-border last:border-0 hover:bg-bg',
                            row.getIsSelected() && 'bg-primary/6',
                          )}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="max-w-52 px-2.5 py-2">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {padBottom > 0 ? (
                      <tr aria-hidden="true">
                        <td style={{ height: padBottom }} colSpan={columns.length} />
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {/* Phone list */}
              <ul
                className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface md:hidden"
                style={{ paddingTop: padTop, paddingBottom: padBottom }}
              >
                {items.map((vi) => {
                  const g = rows[vi.index]!;
                  const selected = !!selection[g.id];
                  return (
                    <li key={g.id}>
                      <ListRow
                        selected={selected}
                        leading={
                          selectMode ? (
                            <input
                              type="checkbox"
                              className="size-6 accent-[var(--hp-primary)]"
                              checked={selected}
                              aria-label={t('selectRow', { name: g.displayName })}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => setSelection((s) => ({ ...s, [g.id]: !s[g.id] }))}
                            />
                          ) : (
                            <Avatar name={g.displayName} />
                          )
                        }
                        title={g.displayName}
                        subtitle={`${g.groupLabel || '—'} · ${g.shortCode}${g.hasSmartphone ? '' : ` · ${t('featurePhone')}`}${g.cardKind === 'contribution' ? ` · ${t('cardKindContribution')}` : ''}`}
                        trailing={
                          <>
                            <ChannelIcon
                              channel={
                                g.channelLast ??
                                (g.inviteChannelPref === 'mixed' ? 'whatsapp' : g.inviteChannelPref)
                              }
                              className="size-4"
                            />
                            <GuestStatusPill guest={g} compact />
                          </>
                        }
                        onOpen={() =>
                          selectMode
                            ? setSelection((s) => ({ ...s, [g.id]: !s[g.id] }))
                            : router.push(`/app/e/${id}/guests/${g.id}`)
                        }
                        onLongPress={() => {
                          setSelectMode(true);
                          setSelection((s) => ({ ...s, [g.id]: true }));
                        }}
                        swipeLeft={{
                          label: t('resend'),
                          icon: <RefreshCw className="size-5" />,
                          onAction: () => resend.mutate([g.id]),
                        }}
                        swipeRight={{
                          label: t('edit'),
                          icon: <Pencil className="size-5" />,
                          onAction: () => setEditing(g),
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 md:hidden"
                onClick={() => setSelectMode((m) => !m)}
              >
                {selectMode ? t('clearSelection') : t('col.select')}
              </Button>
            </div>
          )
        }
      </QueryState>

      {/* Bulk action bar */}
      {anySelected ? (
        <div
          className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface px-3 py-2 shadow-lg md:sticky md:bottom-4 md:mt-4 md:rounded-card md:border"
          role="region"
          aria-label={t('selected', { count: selectedIds.length })}
          data-testid="bulk-bar"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
            <span className="mr-auto font-semibold" aria-live="polite">
              {t('selected', { count: selectedIds.length })}
            </span>
            <Button
              size="sm"
              icon={<Send className="size-4" aria-hidden="true" />}
              onClick={goSendSelected}
            >
              {t('bulkSend')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Printer className="size-4" aria-hidden="true" />}
              onClick={() => print.mutate(selectedIds)}
              loading={print.isPending}
            >
              {t('bulkPrint')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<CheckSquare className="size-4" aria-hidden="true" />}
              onClick={() => markPrint.mutate({ ids: selectedIds, on: true })}
              loading={markPrint.isPending && markPrint.variables?.on === true}
              data-testid="bulk-mark-print"
            >
              {t('bulkMarkPrint')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markPrint.mutate({ ids: selectedIds, on: false })}
              loading={markPrint.isPending && markPrint.variables?.on === false}
            >
              {t('bulkUnmarkPrint')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Tags className="size-4" aria-hidden="true" />}
              onClick={() => setGroupOpen(true)}
            >
              {t('bulkGroup')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<WalletCards className="size-4" aria-hidden="true" />}
              onClick={() => setCardKindOpen(true)}
              data-testid="bulk-card-kind"
            >
              {t('bulkCardKind')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 className="size-4" aria-hidden="true" />}
              onClick={() => setDeleteOpen(true)}
            >
              {t('bulkDelete')}
            </Button>
            <IconButton
              label={t('clearSelection')}
              icon={<X className="size-5" aria-hidden="true" />}
              onClick={() => {
                setSelection({});
                setSelectMode(false);
              }}
            />
          </div>
        </div>
      ) : null}

      <BottomSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t('add')}
        closeLabel={tc('close')}
      >
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href={`/app/e/${id}/guests/new`}
              className="flex min-h-14 items-center gap-3 rounded-card border border-border p-3 font-semibold hover:bg-bg"
              data-testid="add-one"
            >
              <UserPlus className="size-5 text-primary" aria-hidden="true" />
              {t('addOne')}
            </Link>
          </li>
          <li>
            <Link
              href={`/app/e/${id}/guests/import`}
              className="flex min-h-14 items-center gap-3 rounded-card border border-border p-3 font-semibold hover:bg-bg"
              data-testid="add-import"
            >
              <FileUp className="size-5 text-primary" aria-hidden="true" />
              {t('addImport')}
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setAddOpen(false);
                setContactsOpen(true);
              }}
              className="flex min-h-14 w-full items-center gap-3 rounded-card border border-border p-3 text-left font-semibold hover:bg-bg"
            >
              <ContactRound className="size-5 text-primary" aria-hidden="true" />
              {t('addContacts')}
            </button>
          </li>
        </ul>
      </BottomSheet>

      <ContactsSheet
        eventId={id}
        open={contactsOpen}
        onOpenChange={setContactsOpen}
        onImported={invalidate}
      />

      <BottomSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.displayName ?? ''}
        closeLabel={tc('close')}
        size="lg"
      >
        {editing ? (
          <GuestForm eventId={id} guest={editing} onDone={() => setEditing(null)} />
        ) : null}
      </BottomSheet>

      <ConfirmSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('deleteTitle', { count: selectedIds.length })}
        consequence={t('deleteBody')}
        confirmLabel={t('bulkDelete')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={del.isPending}
        onConfirm={() => del.mutate(selectedIds)}
      />

      <BottomSheet
        open={groupOpen}
        onOpenChange={setGroupOpen}
        title={t('groupTitle')}
        closeLabel={tc('close')}
        footer={
          <Button
            onClick={() => regroup.mutate({ ids: selectedIds, g: newGroup.trim() })}
            disabled={!newGroup.trim()}
            loading={regroup.isPending}
          >
            {tc('save')}
          </Button>
        }
      >
        <TextField
          label={t('groupLabel')}
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          list="regroup-list"
          autoFocus
        />
        <datalist id="regroup-list">
          {(groups.data ?? []).map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </BottomSheet>

      <BottomSheet
        open={cardKindOpen}
        onOpenChange={setCardKindOpen}
        title={t('cardKindTitle', { count: selectedIds.length })}
        closeLabel={tc('close')}
      >
        <div className="flex flex-col gap-3">
          <p>{t('cardKindBody')}</p>
          {CARD_KINDS.map((k) => (
            <Button
              key={k}
              variant="secondary"
              block
              loading={recard.isPending && recard.variables?.kind === k}
              onClick={() => recard.mutate({ ids: selectedIds, kind: k })}
              data-testid={`set-card-kind-${k}`}
            >
              {tf(`cardKinds.${k}`)}
            </Button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title={t('saveFilter')}
        closeLabel={tc('close')}
        footer={
          <Button
            disabled={!saveName.trim()}
            onClick={() => {
              persistSaved([
                ...saved.filter((s) => s.name !== saveName.trim()),
                { name: saveName.trim(), filter, group, search },
              ]);
              setSaveOpen(false);
              setSaveName('');
              toast({ tone: 'success', title: t('filterSaved') });
            }}
          >
            {tc('save')}
          </Button>
        }
      >
        <TextField
          label={t('savedFilterName')}
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          autoFocus
        />
      </BottomSheet>
    </>
  );
}

export default function GuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <GuestsInner id={id} />
    </Suspense>
  );
}
