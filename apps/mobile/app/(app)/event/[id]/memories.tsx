import { useState } from 'react';
import { View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useGlobalSearchParams } from 'expo-router';
import { isRepositoryError, type Memory } from '@harusi/api-client';
import {
  useAddMemory,
  useDeleteMemory,
  useMemories,
  useUpdateMemory,
} from '../../../../src/lib/queries';
import { useT } from '../../../../src/lib/i18n';
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

/** Kumbukumbu (ADR 050): add, reorder and delete the couple's photos; captions edit on the web. */
export default function Memories() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const q = useMemories(id);
  const add = useAddMemory(id);
  const update = useUpdateMemory(id);
  const del = useDeleteMemory(id);
  const [caption, setCaption] = useState('');
  const [takenOn, setTakenOn] = useState('');
  const [deleting, setDeleting] = useState<Memory | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const back = () => router.back();

  async function pick() {
    setErr(null);
    if (takenOn && !/^\d{4}-\d{2}-\d{2}$/.test(takenOn)) {
      setErr(t('memories.takenOn'));
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      exif: false,
    });
    const a = r.canceled ? undefined : r.assets[0];
    if (!a) return;
    add.mutate(
      {
        photo: { uri: a.uri, name: a.fileName ?? 'photo.jpg', type: a.mimeType ?? 'image/jpeg' },
        caption: caption.trim() || undefined,
        takenOn: takenOn || undefined,
      },
      {
        onSuccess: () => {
          setCaption('');
          setTakenOn('');
        },
        onError: (e) => {
          const reason = isRepositoryError(e) ? e.details?.reason : undefined;
          setErr(
            reason === 'invalid_image'
              ? t('memories.invalidImage')
              : reason === 'too_large'
                ? t('memories.tooLarge')
                : t('memories.uploadFailed'),
          );
        },
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
  return (
    <Screen>
      <AppHeader title={t('memories.title')} subtitle={t('memories.intro')} onBack={back} />
      <Txt>{t('memories.count', { count: v.count, limit: v.limit })}</Txt>
      <Field
        label={t('memories.caption')}
        value={caption}
        onChangeText={setCaption}
        maxLength={140}
      />
      <Field
        label={t('memories.takenOn')}
        value={takenOn}
        onChangeText={setTakenOn}
        placeholder="2019-03-02"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      {err ? <Banner tone="danger" text={err} /> : null}
      {v.count >= v.limit ? (
        <Banner tone="warning" text={t('memories.full', { limit: v.limit })} />
      ) : null}
      <Button
        label={add.isPending ? t('memories.uploading') : t('memories.add')}
        icon="addPhoto"
        onPress={() => void pick()}
        loading={add.isPending}
        disabled={v.count >= v.limit}
      />
      {v.memories.length === 0 ? (
        <EmptyState icon="memories" text={t('memories.emptyBody')} />
      ) : (
        v.memories.map((m, i) => (
          <Card key={m.id}>
            <View style={{ gap: 8 }}>
              <MemoryThumb eventId={id} memory={m} />
              {m.takenOn ? <Txt size={14}>{m.takenOn}</Txt> : null}
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
                  label={t('memories.delete')}
                  icon="trash"
                  variant="danger"
                  onPress={() => setDeleting(m)}
                />
              </View>
            </View>
          </Card>
        ))
      )}
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
