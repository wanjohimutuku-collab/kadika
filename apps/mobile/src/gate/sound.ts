import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { SOUNDS, toBase64, toneWav } from './wav';

type Kind = keyof typeof SOUNDS;
const players: Partial<Record<Kind, AudioPlayer>> = {};

function playWebAudio(kind: Kind): void {
  try {
    const tones = SOUNDS[kind];
    if (!tones) return;
    const w = globalThis as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    let offset = ctx.currentTime;
    for (const t of tones) {
      if (t.hz > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = kind === 'admit' ? 'sine' : 'sawtooth';
        osc.frequency.setValueAtTime(t.hz, offset);
        gain.gain.setValueAtTime(0.12, offset);
        gain.gain.exponentialRampToValueAtTime(0.001, offset + t.ms / 1000);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(offset);
        osc.stop(offset + t.ms / 1000);
      }
      offset += t.ms / 1000;
    }
    setTimeout(
      () => {
        void ctx.close().catch(() => {});
      },
      (offset - ctx.currentTime) * 1000 + 200,
    );
  } catch {
    /* ignore */
  }
}

/** Plays the result tone. Failures are swallowed: a missing sound must never block a scan. */
export async function playResult(kind: Kind): Promise<void> {
  if (Platform.OS === 'web') {
    playWebAudio(kind);
    return;
  }
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
