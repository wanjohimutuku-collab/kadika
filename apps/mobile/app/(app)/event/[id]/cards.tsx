import { useState } from 'react';
import { Platform, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router, useGlobalSearchParams } from 'expo-router';
import { getRepository } from '../../../../src/lib/repo';
import { useT } from '../../../../src/lib/i18n';
import { AppHeader } from '../../../../src/ui/header';
import { Banner, Button, Screen, Txt } from '../../../../src/ui/kit';

type Layout = { format: 'A6' | 'A5'; layout: 'single' | 'a4-4up' | 'test-sheet'; label: string };

const blobToBase64 = (b: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

/** Downloads the print PDF from the API and hands it to the share sheet (print shop, WhatsApp, email). */
export default function Cards() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const make = async (o: Layout) => {
    setBusy(o.label);
    setMsg(null);
    try {
      const blob = await getRepository().requestCardsPdf(id, {
        format: o.format,
        layout: o.layout,
      });
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'harusi-cards.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } else {
        const uri = `${FileSystem.cacheDirectory}harusi-${o.layout}-${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(uri, await blobToBase64(blob), {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync())
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
      setMsg({ tone: 'success', text: t('mobile.cardsDone') });
    } catch {
      setMsg({ tone: 'danger', text: t('states.errorBody') });
    } finally {
      setBusy(null);
    }
  };

  const opts: Layout[] = [
    { format: 'A6', layout: 'test-sheet', label: t('mobile.cardsTest') },
    { format: 'A6', layout: 'single', label: t('mobile.cardsA6') },
    { format: 'A5', layout: 'single', label: t('mobile.cardsA5') },
    { format: 'A6', layout: 'a4-4up', label: t('mobile.cardsA4') },
  ];
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={t('mobile.cardsTitle')} onBack={() => router.back()} />
      <Screen>
        <Txt>{t('mobile.cardsHelp')}</Txt>
        {msg ? <Banner tone={msg.tone} text={msg.text} /> : null}
        {opts.map((o, i) => (
          <Button
            key={o.label}
            variant={i === 0 ? 'primary' : 'secondary'}
            label={o.label}
            loading={busy === o.label}
            disabled={!!busy}
            onPress={() => make(o)}
          />
        ))}
      </Screen>
    </View>
  );
}
