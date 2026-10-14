import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { SOUNDS, toBase64, toneWav } from './wav';

type Kind = keyof typeof SOUNDS;
const players: Partial<Record<Kind, AudioPlayer>> = {};

/** Plays the result tone. Failures are swallowed: a missing sound must never block a scan. */
export async function playResult(kind: Kind): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    let p = players[kind];
    if (!p) {
      const uri = `${FileSystem.cacheDirectory}gate-${kind}.wav`;
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists)
        await FileSystem.writeAsStringAsync(uri, toBase64(toneWav(SOUNDS[kind])), {
          encoding: FileSystem.EncodingType.Base64,
        });
      p = createAudioPlayer({ uri });
      players[kind] = p;
    }
    await p.seekTo(0);
    p.play();
  } catch {
    /* ignore */
  }
}
