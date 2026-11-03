import { useState } from 'react';
import { Image, Switch, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useGlobalSearchParams } from 'expo-router';
import { isRepositoryError, type Memory, type QuotaExceededDetails } from '@harusi/api-client';
import {
  useAddMemory,
  useDeleteMemory,
  useEvent,
  useMemories,
  useSendMemories,
  useUpdateEvent,
  useUpdateMemory,
} from '../../../../src/lib/queries';
import { useLocale, useT } from '../../../../src/lib/i18n';
import { formatDate } from '../../../../src/lib/format';
import { useColors } from '../../../../src/lib/theme';
import { AppHeader } from '../../../../src/ui/header';
import { MemoryThumb } from '../../../../src/ui/memory-thumb';
import {
  Banner,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Field,
  Screen,
  Skeleton,
  Txt,
} from '../../../../src/ui/kit';

/** A chosen photo waiting for its caption and date; nothing is uploaded until the host says so. */
interface Draft {
  key: string;
  uri: string;
  name: string;
  type: string;
  caption: string;
  takenOn: string;
  error?: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Kumbukumbu (ADR 050): the same page as the web console's, on the phone (§17.8). */
export default function Memories() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const { locale } = useLocale();
  const c = useColors();
  const q = useMemories(id);
  const ev = useEvent(id);
  const add = useAddMemory(id);
  const update = useUpdateMemory(id);
  const del = useDeleteMemory(id);
  const toggle = useUpdateEvent(id);
  const send = useSendMemories(id);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [deleting, setDeleting] = useState<Memory | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const back = () => router.back();
  const role = (ev.data as { myRole?: string } | undefined)?.myRole ?? 'owner';

  const reasonText = (e: unknown) => {
    const reason = isRepositoryError(e) ? e.details?.reason : undefined;
    if (reason === 'invalid_image') return t('memories.invalidImage');
    if (reason === 'too_large') return t('memories.tooLarge');
    if (reason === 'quota_exceeded') return t('memories.full', { limit: q.data?.limit ?? 30 });
    if (isRepositoryError(e) && e.details?.field === 'takenOn') return t('memories.dateFormat');
    return t('memories.uploadFailed');
  };
  const patchDraft = (key: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  async function pick(room: number) {
    setNotice(null);
    const space = room - drafts.length;
    if (space <= 0) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: space,
      quality: 0.85,
      exif: false,
    });
    if (r.canceled) return;
    const chosen = r.assets.slice(0, space);
    if (r.assets.length > space)
      setNotice({ tone: 'danger', text: t('memories.tooMany', { count: space }) });
    setDrafts((ds) => [
      ...ds,
      ...chosen.map((a, i) => ({
        key: `${Date.now()}-${i}`,
        uri: a.uri,
        name: a.fileName ?? `photo-${i + 1}.jpg`,
        type: a.mimeType ?? 'image/jpeg',
        caption: '',
        takenOn: '',
      })),
    ]);
  }

  // One at a time, in the order shown; a photo that fails stays in the list with its reason.
  async function uploadAll() {
    setNotice(null);
    const bad = drafts.filter((d) => d.takenOn && !DATE.test(d.takenOn));
    if (bad.length) {
      for (const d of bad) patchDraft(d.key, { error: t('memories.dateFormat') });
      return;
    }
    setUploading(true);
    let done = 0;
    for (const d of drafts) {
      try {
        await add.mutateAsync({
          photo: { uri: d.uri, name: d.name, type: d.type },
          caption: d.caption.trim() || undefined,
          takenOn: d.takenOn || undefined,
        });
        done++;
        setDrafts((ds) => ds.filter((x) => x.key !== d.key));
      } catch (e) {
        patchDraft(d.key, { error: reasonText(e) });
        if (isRepositoryError(e) && e.details?.reason === 'quota_exceeded') break;
      }
    }
    setUploading(false);
    if (done) setNotice({ tone: 'success', text: t('memories.uploadedCount', { count: done }) });
  }

  function saveEdit() {
    if (!editing) return;
    if (editing.takenOn && !DATE.test(editing.takenOn)) {
      setNotice({ tone: 'danger', text: t('memories.dateFormat') });
      return;
    }
    update.mutate(
      { id: editing.id, caption: editing.caption?.trim() || null, takenOn: editing.takenOn },
      {
        onSuccess: () => setEditing(null),
        onError: (e) => setNotice({ tone: 'danger', text: reasonText(e) }),
      },
    );
  }

  // Swapping two neighbours: memories with the same date (or none) follow the host's order.
  const swap = (a: Memory, b: Memory) => {
    const same = a.sortOrder === b.sortOrder;
    update.mutate({ id: a.id, sortOrder: same ? b.sortOrder + 1 : b.sortOrder });
    update.mutate({ id: b.id, sortOrder: a.sortOrder });
  };

  if (q.isPending)
    return (
      <Screen>
        <AppHeader title={t('memories.title')} onBack={back} />
        <Skeleton height={240} />
      </Screen>
    );
  if (q.isError)
    return (
      <Screen>
        <AppHeader title={t('memories.title')} onBack={back} />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  const v = q.data;
  if (!v.unlocked)
    return (
      <Screen>
        <AppHeader title={t('memories.title')} onBack={back} />
        <Card>
          <Txt bold>{t('memories.lockedTitle')}</Txt>
          <Txt>{t('memories.lockedBody')}</Txt>
        </Card>
        <Button
          label={t('memories.lockedCta')}
          onPress={() => router.push(`/event/${id}/karibu`)}
        />
      </Screen>
    );
  const room = v.limit - v.count;
  return (
    <Screen>
      <AppHeader title={t('memories.title')} subtitle={t('memories.intro')} onBack={back} />
      {role === 'owner' ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt>{t('memories.enabled')}</Txt>
            </View>
            <Switch
              accessibilityLabel={t('memories.enabled')}
              value={v.enabled}
              disabled={toggle.isPending}
              onValueChange={(on) =>
                toggle.mutate({ memoriesEnabled: on }, { onSuccess: () => void q.refetch() })
              }
              trackColor={{ true: c.primary, false: c.border }}
            />
          </View>
        </Card>
      ) : null}
      <Txt>{t('memories.count', { count: v.count, limit: v.limit })}</Txt>
      <Txt size={14} color={c.muted}>
        {t('memories.chooseMany')}
      </Txt>
      {notice ? <Banner tone={notice.tone} text={notice.text} /> : null}
      {room <= 0 ? <Banner tone="warning" text={t('memories.full', { limit: v.limit })} /> : null}
      <Button
        label={t('memories.add')}
        icon="addPhoto"
        variant={drafts.length ? 'secondary' : 'primary'}
        onPress={() => void pick(room)}
        disabled={room - drafts.length <= 0 || uploading}
      />
      {drafts.length ? (
        <Card>
          <View style={{ gap: 16 }}>
            <Txt bold>{t('memories.draftTitle')}</Txt>
            {drafts.map((d) => (
              <View key={d.key} style={{ gap: 8 }}>
                <Image
                  source={{ uri: d.uri }}
                  accessibilityLabel={d.name}
                  style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
                  resizeMode="cover"
                />
                <Field
                  label={t('memories.caption')}
                  value={d.caption}
                  onChangeText={(x) => patchDraft(d.key, { caption: x, error: undefined })}
                  maxLength={140}
                  editable={!uploading}
                />
                <Field
                  label={t('memories.takenOn')}
                  value={d.takenOn}
                  onChangeText={(x) => patchDraft(d.key, { takenOn: x, error: undefined })}
                  placeholder="2019-03-02"
                  hint={t('memories.dateFormat')}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  editable={!uploading}
                />
                {d.error ? <Banner tone="danger" text={d.error} /> : null}
                <Button
                  label={t('memories.removeDraft')}
                  icon="close"
                  variant="ghost"
                  disabled={uploading}
                  onPress={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}
                />
              </View>
            ))}
            <Button
              label={
                uploading
                  ? t('memories.uploading')
                  : t('memories.uploadAll', { count: drafts.length })
              }
              icon="addPhoto"
              onPress={() => void uploadAll()}
              loading={uploading}
            />
            <Button
              label={t('common.cancel')}
              variant="secondary"
              disabled={uploading}
              onPress={() => setDrafts([])}
            />
          </View>
        </Card>
      ) : null}
      {v.enabled && v.count > 0 ? (
        <Card>
          <View style={{ gap: 8 }}>
            <Txt bold>{t('memories.sendTitle')}</Txt>
            <Txt size={14} color={c.muted}>
              {t('memories.sendBody')}
            </Txt>
            <Button
              label={t('memories.sendShort')}
              icon="send"
              variant="secondary"
              loading={send.isPending}
              onPress={() => setSendOpen(true)}
            />
          </View>
        </Card>
      ) : null}
      {v.memories.length === 0 ? (
        <EmptyState icon="memories" text={t('memories.emptyBody')} />
      ) : (
        v.memories.map((m, i) => (
          <Card key={m.id}>
            <View style={{ gap: 8 }}>
              <MemoryThumb
                eventId={id}
                memory={m}
                fallbackLabel={t('memories.photoAltNoCaption')}
              />
              {editing?.id === m.id ? (
                <>
                  <Field
                    label={t('memories.caption')}
                    value={editing.caption ?? ''}
                    onChangeText={(x) => setEditing({ ...editing, caption: x })}
                    maxLength={140}
                  />
                  <Field
                    label={t('memories.takenOn')}
                    value={editing.takenOn ?? ''}
                    onChangeText={(x) => setEditing({ ...editing, takenOn: x || null })}
                    placeholder="2019-03-02"
                    hint={t('memories.dateFormat')}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  <Button
                    label={t('memories.save')}
                    onPress={saveEdit}
                    loading={update.isPending}
                  />
                  <Button
                    label={t('common.cancel')}
                    variant="secondary"
                    onPress={() => setEditing(null)}
                  />
                </>
              ) : (
                <>
                  {m.takenOn ? <Txt size={14}>{formatDate(m.takenOn, locale)}</Txt> : null}
                  {m.caption ? <Txt>{m.caption}</Txt> : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <Button
                      label={t('memories.moveUp')}
                      icon="up"
                      variant="ghost"
                      disabled={i === 0 || update.isPending}
                      onPress={() => swap(m, v.memories[i - 1]!)}
                    />
                    <Button
                      label={t('memories.moveDown')}
                      icon="down"
                      variant="ghost"
                      disabled={i === v.memories.length - 1 || update.isPending}
                      onPress={() => swap(m, v.memories[i + 1]!)}
                    />
                    <Button
                      label={t('memories.editCaption')}
                      icon="edit"
                      variant="ghost"
                      onPress={() => setEditing(m)}
                    />
                    <Button
                      label={t('memories.delete')}
                      icon="trash"
                      variant="danger"
                      onPress={() => setDeleting(m)}
                    />
                  </View>
                </>
              )}
            </View>
          </Card>
        ))
      )}
      <ConfirmSheet
        open={sendOpen}
        title={t('memories.sendTitle')}
        body={t('memories.sendBody')}
        confirmLabel={t('memories.sendShort')}
        onConfirm={() =>
          send.mutate(undefined, {
            onSuccess: (r) =>
              setNotice({
                tone: 'success',
                text: t('memories.sendDone', { sent: r.sent, failed: r.failed }),
              }),
            onError: (e) => {
              const d = isRepositoryError(e) && e.code === 'payment_required';
              const details = (isRepositoryError(e) ? e.details : {}) as
                Partial<QuotaExceededDetails> | undefined;
              setNotice({
                tone: 'danger',
                text: d
                  ? t('billing.quota.messages', {
                      remaining: details?.remaining ?? 0,
                      needed: details?.needed ?? 0,
                    })
                  : t('memories.uploadFailed'),
              });
            },
          })
        }
        onClose={() => setSendOpen(false)}
      />
      <ConfirmSheet
        open={!!deleting}
        title={t('memories.delete')}
        body={
          deleting?.caption
            ? t('memories.deleteConfirm', { caption: deleting.caption })
            : t('memories.deleteConfirmNoCaption')
        }
        confirmLabel={t('memories.delete')}
        danger
        onConfirm={() => {
          if (deleting) del.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
        onClose={() => setDeleting(null)}
      />
    </Screen>
  );
}
