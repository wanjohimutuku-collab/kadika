import type { Country } from './country';

/** Launch-gate numbers per country for the staff dashboard (Phase 5). Shared by the API and clients. */
export interface PilotMetrics {
  country: Country | 'all';
  windowDays: number;
  generatedAt: string;
  events: number;
  /** Spec section 14: share of guests with a phone who were reached by any channel. */
  reach: { guestsWithPhone: number; reached: number; rate: number | null };
  /** Share of invited guests whose last channel was SMS (the feature-phone path). */
  smsPath: { invited: number; viaSms: number; share: number | null };
  messages: {
    channel: 'sms' | 'whatsapp';
    total: number;
    delivered: number;
    failed: number;
    inFlight: number;
    deliveryRate: number | null;
  }[];
  smsByNetwork: {
    network: string;
    label: string;
    total: number;
    delivered: number;
    failed: number;
    inFlight: number;
    deliveryRate: number | null;
  }[];
  payments: {
    started: number;
    success: number;
    failed: number;
    pending: number;
    successRate: number | null;
    /** Median seconds from the prompt to confirmation, successful payments only. */
    medianSecondsToConfirm: number | null;
    timeouts: number;
    lateSuccesses: number;
    amountMismatches: number;
    byMethod: { method: string; started: number; success: number; successRate: number | null }[];
    collected: { currency: string; amount: number }[];
  };
  gate: {
    scans: number;
    admitted: number;
    /** ok / (ok + invalid + wrong event + not found): first reads that worked. */
    firstScanSuccessRate: number | null;
    manualShare: number | null;
    duplicateScans: number;
    /** Guests admitted more than once without a committee override: must be zero. */
    duplicateAdmissions: number;
    offlineScans: number;
    /** Offline scans still unsynced after an hour: must be zero. */
    unsyncedOffline: number;
    /** Proxy for time per guest: median gap between consecutive admissions at one gate, in bursts. */
    medianSecondsBetweenAdmissions: number | null;
  };
}

export type GateStatus = 'met' | 'not_met' | 'no_data';

export interface GateResult {
  key: string;
  /** Blocking gates must be met to open a country; the others are watched. */
  blocking: boolean;
  /** The measured value (ratio 0 to 1, seconds or a count), or null when there is not enough data. */
  value: number | null;
  /** `min`: value must be at least `limit`; `max`: at most. */
  rule: 'min' | 'max';
  limit: number;
  /** Smallest sample before the number counts; below it the gate shows `no_data`. */
  minSample: number;
  sample: number;
  status: GateStatus;
}

/**
 * Launch gates for opening a country (docs/ops/kenya-pilot-runbook.md). Spec section 14 targets where the
 * spec sets one; the payment and SMS limits are proposals for the owner to confirm. Small samples give
 * `no_data`, never a pass.
 */
export function evaluateGates(m: PilotMetrics): GateResult[] {
  const g = (
    key: string,
    blocking: boolean,
    value: number | null,
    rule: 'min' | 'max',
    limit: number,
    sample: number,
    minSample: number,
  ): GateResult => {
    const enough = value !== null && sample >= minSample;
    const status: GateStatus = !enough
      ? 'no_data'
      : (rule === 'min' ? value >= limit : value <= limit)
        ? 'met'
        : 'not_met';
    return { key, blocking, value: enough ? value : null, rule, limit, minSample, sample, status };
  };
  // The weakest operator with enough traffic decides the SMS gate.
  const operators = m.smsByNetwork.filter((n) => n.total >= 20 && n.deliveryRate !== null);
  const worst = operators.length ? Math.min(...operators.map((n) => n.deliveryRate!)) : null;
  const admissionSample = m.gate.admitted;
  return [
    g('reach', true, m.reach.rate, 'min', 0.95, m.reach.guestsWithPhone, 20),
    g('firstScan', true, m.gate.firstScanSuccessRate, 'min', 0.95, m.gate.scans, 20),
    g('gateSpeed', true, m.gate.medianSecondsBetweenAdmissions, 'max', 8, admissionSample, 20),
    // Zero lost scans and zero double admissions only mean something once a real gate has been used.
    g('lostScans', true, m.gate.unsyncedOffline, 'max', 0, m.gate.scans, 20),
    g('duplicateAdmissions', true, m.gate.duplicateAdmissions, 'max', 0, m.gate.admitted, 20),
    g(
      'smsDelivery',
      true,
      worst,
      'min',
      0.9,
      operators.reduce((a, n) => a + n.total, 0),
      20,
    ),
    g('paymentSuccess', true, m.payments.successRate, 'min', 0.9, m.payments.started, 10),
    g('paymentSpeed', false, m.payments.medianSecondsToConfirm, 'max', 90, m.payments.success, 10),
    g('manualShare', false, m.gate.manualShare, 'max', 0.1, m.gate.admitted, 20),
  ];
}
