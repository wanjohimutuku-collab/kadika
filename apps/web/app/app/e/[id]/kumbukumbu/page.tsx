'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Images, ImagePlus, Lock, Pencil, Send, Trash2, X } from 'lucide-react';
import { isRepositoryError, type Memory } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { MemoryPhoto } from '@/components/console/memory-photo';
import { Button, IconButton, buttonClasses } from '@/components/ui/button';
import { Banner, Card, EmptyState, Skeleton } from '@/components/ui/display';
import { TextField } from '@/components/ui/form';
import { Switch } from '@/components/ui/navigation';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { useQuotaToast } from '@/components/console/quota';
import { getRepository } from '@/lib/repo';
import { qk, useSession } from '@/lib/queries';
import { formatDate } from '@/lib/format';

/** A chosen photo waiting for its caption and date; nothing is uploaded until the host says so. */
interface Draft {
  key: string;
  file: File;
  preview: string;
  caption: string;
  takenOn: string;
  error?: string;
}

/** Kumbukumbu (ADR 050): the couple's photos, shown to each guest through their own card link. */
export default function MemoriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('memories');
  const tn = useTranslations('nav');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const qc = useQueryClient();
  const session = useSession();
  const q = useQuery({
    queryKey: qk.memories(id),
    queryFn: () => getRepository().listMemories(id),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: qk.memories(id) });
  const file = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [deleting, setDeleting] = useState<Memory | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const quota = useQuotaToast(id);
  const isOwner = session.data?.role === 'owner';

  const errorText = (e: unknown, limit: number) => {
    const reason = isRepositoryError(e) ? (e.details?.reason as string | undefined) : undefined;
    if (reason === 'invalid_image') return t('invalidImage');
    if (reason === 'too_large') return t('tooLarge');
    if (reason === 'quota_exceeded') return t('full', { limit });
    if (isRepositoryError(e) && e.details?.field === 'caption') return t('caption');
    return t('uploadFailed');
  };

  // Preview URLs are released when a draft leaves the list and when the page closes.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);
  const dropDraft = (key: string) =>
    setDrafts((ds) =>
      ds.filter((d) => {
        if (d.key !== key) return true;
        URL.revokeObjectURL(d.preview);
        previews.current.delete(d.preview);
        return false;
      }),
    );
  const patchDraft = (key: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const choose = (files: File[], room: number) => {
    const space = Math.max(0, room - drafts.length);
    if (files.length > space) toast({ tone: 'info', title: t('tooMany', { count: space }) });
    const next = files.slice(0, space).map((f, i) => {
      const preview = URL.createObjectURL(f);
      previews.current.add(preview);
      return { key: `${Date.now()}-${i}-${f.name}`, file: f, preview, caption: '', takenOn: '' };
    });
    setDrafts((ds) => [...ds, ...next]);
  };

  // One at a time, in the order shown; a photo that fails stays in the list with its reason.
  const add = useMutation({
    mutationFn: async (list: Draft[]) => {
      let done = 0;
      for (const d of list) {
        try {
          await getRepository().addMemory(id, d.file, {
            caption: d.caption.trim() || undefined,
            takenOn: d.takenOn || undefined,
          });
          done++;
          dropDraft(d.key);
        } catch (e) {
          patchDraft(d.key, { error: errorText(e, q.data?.limit ?? 30) });
          if (isRepositoryError(e) && e.details?.reason === 'quota_exceeded') break;
        }
      }
      return done;
    },
    onSuccess: (done) => {
      if (done) toast({ tone: 'success', title: t('uploadedCount', { count: done }) });
    },
    onSettled: () => void refresh(),
  });
  const save = useMutation({
    mutationFn: (m: Memory) =>
      getRepository().updateMemory(m.id, { caption: m.caption, takenOn: m.takenOn }),
    onSuccess: () => {
      setEditing(null);
      toast({ tone: 'success', title: tc('saved') });
      void refresh();
    },
    onError: (e) => toast({ tone: 'error', title: errorText(e, q.data?.limit ?? 30) }),
  });
  // Swapping two neighbours' order: memories with the same date (or none) follow the host's order.
  const move = useMutation({
    mutationFn: async ({ a, b }: { a: Memory; b: Memory }) => {
      const r = getRepository();
      const [x, y] =
        a.sortOrder === b.sortOrder ? [b.sortOrder + 1, a.sortOrder] : [b.sortOrder, a.sortOrder];
      await r.updateMemory(a.id, { sortOrder: x });
      await r.updateMemory(b.id, { sortOrder: y });
    },
    onSettled: () => void refresh(),
  });
  const remove = useMutation({
    mutationFn: (m: Memory) => getRepository().deleteMemory(m.id),
    onSuccess: () => {
      setDeleting(null);
      void refresh();
    },
  });
  // Each guest with a phone gets their own link; one message credit each (ADR 042).
  const send = useMutation({
    mutationFn: () => getRepository().sendMemories(id),
    onSuccess: (r) => {
      setSendOpen(false);
      toast({ tone: 'success', title: t('sendDone', { sent: r.sent, failed: r.failed }) });
    },
    onError: (e) => {
      setSendOpen(false);
      if (!quota(e)) toast({ tone: 'error', title: t('uploadFailed') });
    },
  });
  const toggle = useMutation({
    mutationFn: (on: boolean) => getRepository().updateEvent(id, { memoriesEnabled: on }),
    onSuccess: () => {
      void refresh();
      void qc.invalidateQueries({ queryKey: qk.event(id) });
    },
  });

  return (
    <>
      <PageHeader title={tn('memories')} subtitle={t('intro')} />
      <QueryState query={q} skeleton={<Skeleton className="h-64" />}>
        {(v) =>
          !v.unlocked ? (
            <Card>
              <EmptyState
                icon={<Lock className="size-6" />}
                title={
                  <>
                    <span className="block font-semibold">{t('lockedTitle')}</span>
                    <span className="text-muted">{t('lockedBody')}</span>
                  </>
                }
                action={
                  isOwner ? (
                    <Link href={`/app/e/${id}/billing`} className={buttonClasses('primary')}>
                      {t('lockedCta')}
                    </Link>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-6">
              <Card>
                <div className="flex flex-col gap-4">
                  {isOwner ? (
                    <Switch
                      checked={v.enabled}
                      onCheckedChange={(on) => toggle.mutate(on)}
                      label={t('enabled')}
                      disabled={toggle.isPending}
                    />
                  ) : null}
                  <p className="text-muted" data-testid="memories-count">
                    {t('count', { count: v.count, limit: v.limit })}
                  </p>
                  <p className="text-sm text-muted">{t('chooseMany')}</p>
                  <input
                    ref={file}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    data-testid="memory-file"
                    onChange={(e) => {
                      choose([...(e.target.files ?? [])], v.limit - v.count);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    variant={drafts.length ? 'secondary' : 'primary'}
                    icon={<ImagePlus className="size-5" aria-hidden="true" />}
                    onClick={() => file.current?.click()}
                    disabled={v.count + drafts.length >= v.limit || add.isPending}
                  >
                    {t('add')}
                  </Button>
                  {v.count >= v.limit ? (
                    <Banner tone="warning">{t('full', { limit: v.limit })}</Banner>
                  ) : null}
                </div>
              </Card>
              {drafts.length ? (
                <Card title={t('draftTitle')}>
                  <div className="flex flex-col gap-4">
                    <ul className="flex flex-col gap-4" data-testid="memory-drafts">
                      {drafts.map((d) => (
                        <li
                          key={d.key}
                          className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0 sm:flex-row"
                        >
                          <div className="relative w-full shrink-0 sm:w-40">
                            <img
                              src={d.preview}
                              alt={d.file.name}
                              className="aspect-square w-full rounded-card bg-border object-cover"
                            />
                            <IconButton
                              label={t('removeDraft')}
                              icon={<X className="size-5" />}
                              variant="secondary"
                              className="absolute right-2 top-2"
                              disabled={add.isPending}
                              onClick={() => dropDraft(d.key)}
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-3">
                            <TextField
                              label={t('caption')}
                              value={d.caption}
                              maxLength={140}
                              disabled={add.isPending}
                              onChange={(e) => patchDraft(d.key, { caption: e.target.value })}
                            />
                            <TextField
                              label={t('takenOn')}
                              type="date"
                              value={d.takenOn}
                              disabled={add.isPending}
                              onChange={(e) => patchDraft(d.key, { takenOn: e.target.value })}
                            />
                            {d.error ? <Banner tone="error">{d.error}</Banner> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        icon={<ImagePlus className="size-5" aria-hidden="true" />}
                        onClick={() => add.mutate(drafts)}
                        loading={add.isPending}
                        loadingLabel={t('uploading')}
                        data-testid="memory-upload"
                      >
                        {t('uploadAll', { count: drafts.length })}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={add.isPending}
                        onClick={() => drafts.forEach((d) => dropDraft(d.key))}
                      >
                        {tc('cancel')}
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}
              {v.enabled && v.count > 0 ? (
                <Card title={t('sendTitle')}>
                  <div className="flex flex-col gap-3">
                    <p className="text-muted">{t('sendBody')}</p>
                    <Button
                      variant="secondary"
                      icon={<Send className="size-5" aria-hidden="true" />}
                      onClick={() => setSendOpen(true)}
                      data-testid="send-memories"
                    >
                      {t('sendTitle')}
                    </Button>
                  </div>
                </Card>
              ) : null}
              {v.memories.length === 0 ? (
                <Card>
                  <EmptyState icon={<Images className="size-6" />} title={t('emptyBody')} />
                </Card>
              ) : (
                <ol className="grid gap-4 sm:grid-cols-2" data-testid="console-memories">
                  {v.memories.map((m, i) => (
                    <li key={m.id}>
                      <Card as="article">
                        <div className="flex flex-col gap-2">
                          <MemoryPhoto
                            eventId={id}
                            memoryId={m.id}
                            alt={m.caption ?? t('photoAltNoCaption')}
                            width={m.width}
                            height={m.height}
                          />
                          {m.takenOn ? (
                            <p className="text-sm text-muted">{formatDate(m.takenOn, locale)}</p>
                          ) : null}
                          {m.caption ? <p>{m.caption}</p> : null}
                          {editing?.id === m.id ? (
                            <div className="flex flex-col gap-3">
                              <TextField
                                label={t('caption')}
                                value={editing.caption ?? ''}
                                maxLength={140}
                                onChange={(e) =>
                                  setEditing({ ...editing, caption: e.target.value || null })
                                }
                              />
                              <TextField
                                label={t('takenOn')}
                                type="date"
                                value={editing.takenOn ?? ''}
                                onChange={(e) =>
                                  setEditing({ ...editing, takenOn: e.target.value || null })
                                }
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => save.mutate(editing)}
                                  loading={save.isPending}
                                >
                                  {t('save')}
                                </Button>
                                <Button variant="secondary" onClick={() => setEditing(null)}>
                                  {tc('cancel')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <IconButton
                                label={t('moveUp')}
                                icon={<ArrowUp className="size-5" />}
                                disabled={i === 0 || move.isPending}
                                onClick={() => move.mutate({ a: m, b: v.memories[i - 1]! })}
                              />
                              <IconButton
                                label={t('moveDown')}
                                icon={<ArrowDown className="size-5" />}
                                disabled={i === v.memories.length - 1 || move.isPending}
                                onClick={() => move.mutate({ a: m, b: v.memories[i + 1]! })}
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Pencil className="size-4" aria-hidden="true" />}
                                onClick={() => setEditing(m)}
                              >
                                {t('edit')}
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                icon={<Trash2 className="size-4" aria-hidden="true" />}
                                onClick={() => setDeleting(m)}
                              >
                                {t('delete')}
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )
        }
      </QueryState>
      <ConfirmSheet
        open={sendOpen}
        onOpenChange={setSendOpen}
        title={t('sendTitle')}
        consequence={t('sendBody')}
        confirmLabel={t('sendTitle')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        tone="primary"
        loading={send.isPending}
        onConfirm={() => send.mutate()}
      />
      <ConfirmSheet
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title={t('delete')}
        consequence={
          deleting?.caption
            ? t('deleteConfirm', { caption: deleting.caption })
            : t('deleteConfirmNoCaption')
        }
        confirmLabel={t('delete')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting);
        }}
      />
    </>
  );
}
