export type GateSoundKind = 'ok' | 'success' | 'warn' | 'alarm' | 'duplicate';

/**
 * Plays synthesized gate audio feedback without external audio files.
 * - 'success' / 'ok': Crisp rising two-tone chime for valid admission.
 * - 'alarm' / 'warn' / 'duplicate': Urgent multi-pulse buzzer alarm for errors, duplicates, or denied entry.
 */
export function playGateSound(kind: GateSoundKind): void {
  try {
    const w = globalThis as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;

    if (kind === 'ok' || kind === 'success') {
      // Pleasant rising harmonic chime (659.25Hz E5 -> 880Hz A5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.08);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.28);

      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          void ctx.close().catch(() => {});
        }, 350);
      }
      return;
    }

    // Alarm / Duplicate / Warning sound:
    // Multi-pulse harsh buzzer alarm alerting gate staff
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';

    // Pulse 1: 240Hz for 120ms
    osc.frequency.setValueAtTime(240, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.setValueAtTime(0.15, now + 0.12);
    // Gap: 40ms silence
    gain.gain.setValueAtTime(0.0001, now + 0.13);
    // Pulse 2: 160Hz alarm tone
    osc.frequency.setValueAtTime(160, now + 0.17);
    gain.gain.setValueAtTime(0.15, now + 0.17);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.42);

    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        void ctx.close().catch(() => {});
      }, 500);
    }
  } catch {
    // Autoplay restrictions or audio context failure must never interrupt scanning
  }
}
