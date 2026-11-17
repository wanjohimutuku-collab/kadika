'use client';

import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, QrCode, Smartphone } from 'lucide-react';
import { emit } from '@/lib/analytics-client';
import type { TrySectionCopy } from '@/content/home';

/**
 * Three interactive, client-only steps — a visitor opens the demo card, confirms an RSVP, then
 * scans the gate — before ever signing up. No network calls. The gate overlay uses the same
 * ADR 006 contrast-safe fills the real scanner uses, and every state carries an icon or word so
 * colour is never the only signal.
 */

type GateState = 'ok' | 'duplicate' | 'denied';
const GATE_SEQUENCE: GateState[] = ['ok', 'duplicate', 'denied'];
const GATE_FILL: Record<GateState, string> = {
  ok: '#075E20',
  duplicate: '#7A4A00',
  denied: '#8C1D17',
};
const GATE_ICON: Record<GateState, string> = {
  ok: '✓',
  duplicate: '!',
  denied: '✕',
};

export interface TrySectionProps {
  copy: TrySectionCopy;
  demoHref: string;
  smsPreview?: { from: string; text: string };
  gateCopy: { ok: string; duplicate: string; denied: string };
  rsvpCopy: { yes: string; no: string; confirmed: string; partyLabel: string };
}

export function TrySection({ copy, demoHref, smsPreview, gateCopy, rsvpCopy }: TrySectionProps) {
  const [rsvp, setRsvp] = useState<'none' | 'yes' | 'no'>('none');
  const [party, setParty] = useState(2);
  const [confirmed, setConfirmed] = useState(0);
  const [gate, setGate] = useState<GateState | null>(null);

  function confirmYes() {
    if (rsvp === 'yes') {
      setRsvp('none');
      setConfirmed((n) => Math.max(0, n - 1));
      emit('home_try_step_interact', { step: 2, action: 'rsvp_undo' });
    } else {
      setRsvp('yes');
      setConfirmed((n) => n + 1);
      emit('home_try_step_interact', { step: 2, action: 'rsvp_yes' });
    }
  }

  function declineRsvp() {
    if (rsvp === 'no') {
      setRsvp('none');
      emit('home_try_step_interact', { step: 2, action: 'rsvp_undo' });
    } else {
      if (rsvp === 'yes') setConfirmed((n) => Math.max(0, n - 1));
      setRsvp('no');
      emit('home_try_step_interact', { step: 2, action: 'rsvp_no' });
    }
  }

  function cycleGate() {
    const idx = gate ? GATE_SEQUENCE.indexOf(gate) : -1;
    const next = GATE_SEQUENCE[(idx + 1) % GATE_SEQUENCE.length]!;
    setGate(next);
    emit('home_try_step_interact', { step: 3, action: `gate_${next}` });
    window.setTimeout(() => setGate(null), 2500);
  }

  return (
    <section aria-labelledby="jaribu" className="bg-ks-paper py-16 md:py-24">
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              id="jaribu"
              className="font-serif text-[30px] leading-[1.1] tracking-[-0.02em] text-ks-green-900 md:text-[42px]"
            >
              {copy.title}
            </h2>
          </div>
          <span
            aria-live="polite"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-ks-green-900 ring-1 ring-ks-line"
          >
            <span aria-hidden="true" className="size-2 rounded-full bg-ks-green-700" />
            {copy.counterLabel.replace('{n}', String(confirmed))}
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* Step 1: open the full card on /jaribu */}
          <article className="ks-bezel flex">
            <div className="ks-core flex w-full flex-col gap-4 p-6 md:p-7">
              <div className="flex items-center justify-between">
                <span className="tabular font-ks-names text-3xl leading-none text-ks-green-700 italic">
                  {copy.steps[0].eyebrow}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ks-green-100/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ks-green-900">
                  <Smartphone className="size-3" aria-hidden="true" />
                  SMS · WhatsApp
                </span>
              </div>
              <h3 className="text-xl font-semibold text-ks-ink">{copy.steps[0].title}</h3>
              <p className="text-sm leading-relaxed text-ks-muted">{copy.steps[0].body}</p>
              {smsPreview ? (
                <div className="rounded-2xl border border-ks-line bg-ks-paper p-3 text-xs">
                  <p className="font-semibold text-ks-muted">{smsPreview.from}</p>
                  <p className="mt-1 rounded-xl bg-ks-green-100/70 px-3 py-2 leading-snug text-ks-ink">
                    {smsPreview.text}
                  </p>
                </div>
              ) : null}
              <a
                href={demoHref}
                target="_blank"
                rel="noopener"
                onClick={() => emit('home_try_step_interact', { step: 1, action: 'open_card' })}
                className="group mt-auto inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-ks-green-700 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgb(15_92_77/0.55)] transition hover:bg-ks-green-900"
              >
                <span>{copy.steps[0].cta}</span>
                <ArrowUpRight
                  className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-px"
                  aria-hidden="true"
                />
              </a>
            </div>
          </article>

          {/* Step 2: RSVP */}
          <article className="ks-bezel flex">
            <div className="ks-core flex w-full flex-col gap-4 p-6 md:p-7">
              <div className="flex items-center justify-between">
                <span className="tabular font-ks-names text-3xl leading-none text-ks-green-700 italic">
                  {copy.steps[1].eyebrow}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ks-gold-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ks-green-900">
                  <CheckCircle2 className="size-3 text-ks-gold-500" aria-hidden="true" />
                  RSVP
                </span>
              </div>
              <h3 className="text-xl font-semibold text-ks-ink">{copy.steps[1].title}</h3>
              <p className="text-sm leading-relaxed text-ks-muted">{copy.steps[1].body}</p>

              <div className="mt-auto flex flex-col gap-3 rounded-2xl border border-ks-line bg-ks-paper p-3.5">
                {rsvp !== 'yes' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmYes}
                      className="min-h-11 flex-1 rounded-full bg-ks-green-700 px-3 text-sm font-semibold text-white transition hover:bg-ks-green-900"
                    >
                      {rsvpCopy.yes}
                    </button>
                    <button
                      type="button"
                      onClick={declineRsvp}
                      aria-pressed={rsvp === 'no'}
                      className="min-h-11 flex-1 rounded-full border border-ks-line bg-white px-3 text-sm font-semibold text-ks-ink transition hover:border-ks-green-700/40"
                    >
                      {rsvpCopy.no}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={confirmYes}
                    role="status"
                    className="flex min-h-11 items-center justify-between rounded-xl bg-ks-green-100 px-4 py-2.5 text-sm font-semibold text-ks-green-900"
                  >
                    <span>
                      ✓ {rsvpCopy.confirmed} · {party}
                    </span>
                  </button>
                )}
                <div className="flex items-center justify-between border-t border-ks-line/80 pt-2.5">
                  <span className="text-sm font-medium text-ks-muted">{rsvpCopy.partyLabel}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParty((p) => Math.max(1, p - 1))}
                      aria-label="minus"
                      className="flex size-9 items-center justify-center rounded-full border border-ks-line bg-white font-semibold transition hover:border-ks-green-700"
                    >
                      −
                    </button>
                    <span aria-live="polite" className="tabular w-8 text-center font-bold">
                      {party}
                    </span>
                    <button
                      type="button"
                      onClick={() => setParty((p) => Math.min(9, p + 1))}
                      aria-label="plus"
                      className="flex size-9 items-center justify-center rounded-full border border-ks-line bg-white font-semibold transition hover:border-ks-green-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Step 3: gate scan */}
          <article className="ks-bezel flex">
            <div className="ks-core flex w-full flex-col gap-4 p-6 md:p-7">
              <div className="flex items-center justify-between">
                <span className="tabular font-ks-names text-3xl leading-none text-ks-green-700 italic">
                  {copy.steps[2].eyebrow}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ks-magenta-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ks-magenta">
                  <QrCode className="size-3" aria-hidden="true" />
                  QR · Offline
                </span>
              </div>
              <h3 className="text-xl font-semibold text-ks-ink">{copy.steps[2].title}</h3>
              <p className="text-sm leading-relaxed text-ks-muted">{copy.steps[2].body}</p>
              <div className="mt-auto flex flex-col gap-3">
                {gate ? (
                  <div
                    role="status"
                    className="flex items-center gap-3 rounded-2xl px-4 py-4 text-white motion-safe:transition-colors"
                    style={{ background: GATE_FILL[gate] }}
                  >
                    <span aria-hidden="true" className="text-2xl font-bold">
                      {GATE_ICON[gate]}
                    </span>
                    <div>
                      <p className="text-[11px] uppercase tracking-widest opacity-90">{gate}</p>
                      <p className="font-semibold">{gateCopy[gate]}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-2xl border border-dashed border-ks-line bg-ks-paper px-4 py-3 text-xs text-ks-muted">
                    <span className="font-mono font-semibold text-ks-ink">KH-4826</span>
                    <span>Mwanaidi Salim · ×{party}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={cycleGate}
                  className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-ks-green-700 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgb(15_92_77/0.55)] transition hover:bg-ks-green-900"
                >
                  <QrCode className="size-4" aria-hidden="true" />
                  <span>{copy.steps[2].cta}</span>
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
