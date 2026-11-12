'use client';

import { useState } from 'react';
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
  gateCopy: { ok: string; duplicate: string; denied: string };
  rsvpCopy: { yes: string; no: string; confirmed: string; partyLabel: string };
}

export function TrySection({ copy, demoHref, gateCopy, rsvpCopy }: TrySectionProps) {
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
      const wasNo = rsvp === 'no';
      setRsvp('yes');
      setConfirmed((n) => (wasNo ? n + 1 : n + 1));
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
    <section aria-labelledby="jaribu" className="bg-ks-bg py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
          <h2 id="jaribu" className="font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            {copy.title}
          </h2>
          <span aria-live="polite" className="text-sm text-ks-muted">
            {copy.counterLabel.replace('{n}', String(confirmed))}
          </span>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Step 1: open the full card on /jaribu */}
          <article className="flex h-full flex-col gap-4 rounded-2xl border border-ks-border bg-ks-surface p-6">
            <span className="text-xs tracking-widest text-ks-muted">{copy.steps[0].eyebrow}</span>
            <h3 className="text-xl font-semibold">{copy.steps[0].title}</h3>
            <p className="text-ks-muted">{copy.steps[0].body}</p>
            <a
              href={demoHref}
              target="_blank"
              rel="noopener"
              onClick={() => emit('home_try_step_interact', { step: 1, action: 'open_card' })}
              className="mt-auto inline-flex min-h-12 w-fit items-center rounded-full bg-ks-green-700 px-5 font-semibold text-white"
            >
              {copy.steps[0].cta}
            </a>
          </article>

          {/* Step 2: RSVP */}
          <article className="flex h-full flex-col gap-4 rounded-2xl border border-ks-border bg-ks-surface p-6">
            <span className="text-xs tracking-widest text-ks-muted">{copy.steps[1].eyebrow}</span>
            <h3 className="text-xl font-semibold">{copy.steps[1].title}</h3>
            <p className="text-ks-muted">{copy.steps[1].body}</p>
            {rsvp !== 'yes' ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmYes}
                  className="min-h-12 flex-1 rounded-full bg-ks-green-700 font-semibold text-white"
                >
                  {rsvpCopy.yes}
                </button>
                <button
                  type="button"
                  onClick={declineRsvp}
                  aria-pressed={rsvp === 'no'}
                  className="min-h-12 flex-1 rounded-full border border-ks-border font-semibold"
                >
                  {rsvpCopy.no}
                </button>
              </div>
            ) : (
              <div
                role="status"
                className="rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-ks-green-700"
              >
                {rsvpCopy.confirmed} · {party}
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-sm text-ks-muted">{rsvpCopy.partyLabel}</span>
              <button
                type="button"
                onClick={() => setParty((p) => Math.max(1, p - 1))}
                aria-label="minus"
                className="size-10 rounded-full border border-ks-border"
              >
                −
              </button>
              <span aria-live="polite" className="w-10 text-center font-semibold">
                {party}
              </span>
              <button
                type="button"
                onClick={() => setParty((p) => Math.min(9, p + 1))}
                aria-label="plus"
                className="size-10 rounded-full border border-ks-border"
              >
                +
              </button>
            </div>
          </article>

          {/* Step 3: gate scan */}
          <article className="flex h-full flex-col gap-4 rounded-2xl border border-ks-border bg-ks-surface p-6">
            <span className="text-xs tracking-widest text-ks-muted">{copy.steps[2].eyebrow}</span>
            <h3 className="text-xl font-semibold">{copy.steps[2].title}</h3>
            <p className="text-ks-muted">{copy.steps[2].body}</p>
            <button
              type="button"
              onClick={cycleGate}
              className="mt-auto inline-flex min-h-12 w-fit items-center rounded-full bg-ks-green-700 px-5 font-semibold text-white"
            >
              {copy.steps[2].cta}
            </button>
            {gate ? (
              <div
                role="status"
                className="flex items-center gap-3 rounded-xl px-4 py-5 text-white motion-safe:transition-colors"
                style={{ background: GATE_FILL[gate] }}
              >
                <span aria-hidden="true" className="text-2xl font-bold">
                  {GATE_ICON[gate]}
                </span>
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-90">{gate}</p>
                  <p className="font-semibold">{gateCopy[gate]}</p>
                </div>
              </div>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  );
}
