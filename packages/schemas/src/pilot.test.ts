import { describe, expect, it } from 'vitest';
import { evaluateGates, type PilotMetrics } from './pilot';

const base = (over: Partial<PilotMetrics> = {}): PilotMetrics => ({
  country: 'KE',
  windowDays: 30,
  generatedAt: '2026-10-15T00:00:00.000Z',
  events: 3,
  reach: { guestsWithPhone: 300, reached: 291, rate: 0.97 },
  smsPath: { invited: 300, viaSms: 90, share: 0.3 },
  messages: [],
  smsByNetwork: [
    {
      network: '63902',
      label: 'Safaricom',
      total: 200,
      delivered: 190,
      failed: 5,
      inFlight: 5,
      deliveryRate: 0.95,
    },
    {
      network: '63903',
      label: 'Airtel Kenya',
      total: 100,
      delivered: 92,
      failed: 6,
      inFlight: 2,
      deliveryRate: 0.92,
    },
  ],
  payments: {
    started: 50,
    success: 47,
    failed: 3,
    pending: 0,
    successRate: 0.94,
    medianSecondsToConfirm: 40,
    timeouts: 1,
    lateSuccesses: 0,
    amountMismatches: 0,
    byMethod: [],
    collected: [],
  },
  gate: {
    scans: 320,
    admitted: 300,
    firstScanSuccessRate: 0.97,
    manualShare: 0.04,
    duplicateScans: 12,
    duplicateAdmissions: 0,
    offlineScans: 40,
    unsyncedOffline: 0,
    medianSecondsBetweenAdmissions: 6,
  },
  ...over,
});
const by = (m: PilotMetrics) => Object.fromEntries(evaluateGates(m).map((g) => [g.key, g.status]));

describe('launch gates', () => {
  it('passes a healthy pilot', () => {
    expect(Object.values(by(base()))).toEqual(Array(9).fill('met'));
  });

  it('fails each gate that misses its limit', () => {
    const m = base({
      reach: { guestsWithPhone: 300, reached: 270, rate: 0.9 },
      gate: {
        ...base().gate,
        firstScanSuccessRate: 0.9,
        medianSecondsBetweenAdmissions: 12,
        unsyncedOffline: 2,
        duplicateAdmissions: 1,
        manualShare: 0.2,
      },
      payments: { ...base().payments, successRate: 0.8, medianSecondsToConfirm: 120 },
      smsByNetwork: [{ ...base().smsByNetwork[0]!, deliveryRate: 0.8 }],
    });
    expect(by(m)).toEqual({
      reach: 'not_met',
      firstScan: 'not_met',
      gateSpeed: 'not_met',
      lostScans: 'not_met',
      duplicateAdmissions: 'not_met',
      smsDelivery: 'not_met',
      paymentSuccess: 'not_met',
      paymentSpeed: 'not_met',
      manualShare: 'not_met',
    });
  });

  it('never passes on too little data', () => {
    const m = base({
      reach: { guestsWithPhone: 5, reached: 5, rate: 1 },
      payments: { ...base().payments, started: 3, successRate: 1 },
      smsByNetwork: [{ ...base().smsByNetwork[0]!, total: 10 }],
    });
    const r = by(m);
    expect(r.reach).toBe('no_data');
    expect(r.paymentSuccess).toBe('no_data');
    expect(r.smsDelivery).toBe('no_data');
  });

  it('does not pass the zero-count gates before a gate has really been used', () => {
    const m = base({
      gate: { ...base().gate, scans: 0, admitted: 0, unsyncedOffline: 0, duplicateAdmissions: 0 },
    });
    const r = by(m);
    expect(r.lostScans).toBe('no_data');
    expect(r.duplicateAdmissions).toBe('no_data');
  });

  it('lets the weakest operator with enough traffic decide the SMS gate', () => {
    const m = base({
      smsByNetwork: [
        { ...base().smsByNetwork[0]!, deliveryRate: 0.99 },
        { ...base().smsByNetwork[1]!, deliveryRate: 0.85 },
      ],
    });
    expect(by(m).smsDelivery).toBe('not_met');
    const g = evaluateGates(m).find((x) => x.key === 'smsDelivery')!;
    expect(g.value).toBe(0.85);
  });

  it('marks the blocking gates', () => {
    const blocking = evaluateGates(base())
      .filter((g) => g.blocking)
      .map((g) => g.key);
    expect(blocking).toContain('lostScans');
    expect(blocking).not.toContain('manualShare');
  });
});
