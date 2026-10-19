import { eq, max } from 'drizzle-orm';
import { paymentSettings, users } from '@harusi/db';
import { FakePaymentProvider, SnippePaymentProvider, type PaymentProvider } from '@harusi/payments';
import {
  PAYMENT_PROVIDERS,
  PAYMENT_ROUTES,
  paymentProviderFields,
  type PaymentRoute,
  type PaymentRouteView,
  type PaymentSettingsInput,
  type PaymentSettingsView,
} from '@harusi/schemas/payment-settings';
import type { Config } from '../config';
import type { Deps } from '../context';
import { decryptSecret, encryptSecret } from '../crypto-at-rest';
import { ApiError } from '../errors';
import { recordAudit } from './audit';
import { requireSettingsAdmin } from './staff-guard';

/** A route's provider and its fields (flat strings; secrets included). */
export interface PaymentRouteSettings {
  provider: string;
  fields: Record<string, string>;
}
export type PaymentSettings = Record<PaymentRoute, PaymentRouteSettings>;

const ROUTE_LABEL: Record<PaymentRoute, string> = { tz: 'Payments (Tanzania)' };
const WEBHOOK_PATH = (provider: string) => `/v1/payments/webhook/${provider}`;

/** What the environment says: only the fake provider exists there (ADR 023). */
export function envPaymentSettings(config: Pick<Config, 'paymentProvider'>): PaymentSettings {
  return { tz: { provider: config.paymentProvider, fields: {} } };
}

/** Why a route's settings cannot be used, or null when they can. */
export function paymentSettingsProblem(
  route: PaymentRoute,
  s: PaymentRouteSettings,
  config: Pick<Config, 'apiPublicUrl'>,
): string | null {
  if (!(s.provider in PAYMENT_PROVIDERS[route]))
    return `Unknown ${ROUTE_LABEL[route]} provider "${s.provider}" (${Object.keys(PAYMENT_PROVIDERS[route]).join(' | ')})`;
  const missing = paymentProviderFields(route, s.provider)
    .filter((f) => 'required' in f && f.required && !s.fields[f.key])
    .map((f) => f.key);
  if (missing.length)
    return `${ROUTE_LABEL[route]} provider ${s.provider} needs ${missing.join(', ')}`;
  if (s.provider === 'snippe') {
    if (!config.apiPublicUrl)
      return 'API_PUBLIC_URL is not set, so Snippe has nowhere to send payment results';
    const env = s.fields.environment;
    if (env && env !== 'production' && env !== 'sandbox')
      return 'environment must be production or sandbox';
  }
  return null;
}

/** The provider these settings describe, or undefined when payments are off. */
export function buildPayments(
  config: Pick<Config, 'apiPublicUrl' | 'paymentWebhookSecret'>,
  s: PaymentSettings,
): PaymentProvider | undefined {
  const tz = s.tz;
  if (tz.provider === 'snippe') {
    const f = tz.fields;
    return new SnippePaymentProvider({
      apiKey: f.apiKey!,
      webhookSigningKey: f.webhookSigningKey!,
      environment: f.environment === 'sandbox' ? 'sandbox' : 'production',
      receiptEmail: f.receiptEmail || undefined,
      callbackUrl: `${config.apiPublicUrl}${WEBHOOK_PATH('snippe')}`,
    });
  }
  // `fake`: collects nothing; needs a webhook secret to exist, as before (ADR 023).
  return config.paymentWebhookSecret
    ? new FakePaymentProvider(config.paymentWebhookSecret)
    : undefined;
}

/** Validates then swaps the live provider into `deps`. Throws (and changes nothing) on bad settings. */
export function applyPayments(deps: Deps, s: PaymentSettings): void {
  for (const route of PAYMENT_ROUTES) {
    const problem = paymentSettingsProblem(route, s[route], deps.config);
    if (problem) throw new Error(problem);
  }
  deps.payments = buildPayments(deps.config, s);
}

const hint = (v: string) => `…${v.slice(-4)}`;

/** Staff-only payment gateway settings (ADR 036). Admin staff only: these hold gateway secrets. */
export class PaymentSettingsService {
  private appliedStamp: number | null = null;
  private readonly env: PaymentSettings;

  constructor(
    private deps: Deps,
    private opts: { log?: (line: Record<string, unknown>) => void } = {},
  ) {
    this.env = envPaymentSettings(deps.config);
  }

  private requireAdmin(userId: string) {
    return requireSettingsAdmin(this.deps.db, userId);
  }

  private async rows() {
    const rows = await this.deps.db
      .select({ s: paymentSettings, by: users.name })
      .from(paymentSettings)
      .leftJoin(users, eq(users.id, paymentSettings.updatedBy));
    const out = new Map<
      PaymentRoute,
      { settings: PaymentRouteSettings; updatedAt: Date; updatedBy: string | null }
    >();
    for (const r of rows) {
      if (!(PAYMENT_ROUTES as readonly string[]).includes(r.s.route)) continue;
      const fields = JSON.parse(
        await decryptSecret(r.s.configEnc, this.deps.config.keyEncSecret),
      ) as Record<string, string>;
      out.set(r.s.route as PaymentRoute, {
        settings: { provider: r.s.provider, fields },
        updatedAt: r.s.updatedAt,
        updatedBy: r.by,
      });
    }
    return out;
  }

  private async effective() {
    const rows = await this.rows();
    const s = { ...this.env };
    for (const [route, r] of rows) s[route] = r.settings;
    return { s, rows };
  }

  /**
   * Loads saved settings into the live provider. Called at startup and every minute, so every API
   * instance picks up a save made on another one. A broken saved row is logged and the last good
   * provider keeps running.
   */
  async refresh(force = false): Promise<void> {
    const [m] = await this.deps.db
      .select({ at: max(paymentSettings.updatedAt) })
      .from(paymentSettings);
    const stamp = m?.at ? new Date(m.at).getTime() : 0;
    if (!force && stamp === this.appliedStamp) return;
    try {
      const { s } = await this.effective();
      applyPayments(this.deps, s);
      this.appliedStamp = stamp;
    } catch (e) {
      this.opts.log?.({
        level: 'error',
        msg: 'payment settings not applied',
        error: (e as Error).message,
      });
      this.appliedStamp = stamp;
    }
  }

  async view(userId: string): Promise<PaymentSettingsView> {
    await this.requireAdmin(userId);
    const { s, rows } = await this.effective();
    const routes: PaymentRouteView[] = PAYMENT_ROUTES.map((route) => {
      const { provider, fields } = s[route];
      const plain: Record<string, string> = {};
      const secrets: Record<string, string> = {};
      for (const f of paymentProviderFields(route, provider)) {
        const v = fields[f.key];
        if (!v) continue;
        if ('secret' in f && f.secret) secrets[f.key] = hint(v);
        else plain[f.key] = v;
      }
      const row = rows.get(route);
      return {
        route,
        provider,
        source: row ? 'database' : 'environment',
        fields: plain,
        secrets,
        active: this.deps.payments?.name ?? null,
        updatedAt: row?.updatedAt.toISOString() ?? null,
        updatedBy: row?.updatedBy ?? null,
      };
    });
    const base = this.deps.config.apiPublicUrl;
    return {
      routes,
      webhooks: base
        ? [{ route: 'tz', provider: 'snippe', url: `${base}${WEBHOOK_PATH('snippe')}` }]
        : [],
    };
  }

  async save(
    userId: string,
    route: PaymentRoute,
    input: PaymentSettingsInput,
  ): Promise<PaymentSettingsView> {
    await this.requireAdmin(userId);
    const { s } = await this.effective();
    const current = s[route];
    const defs = paymentProviderFields(route, input.provider);
    const fields: Record<string, string> = {};
    for (const f of defs) {
      const v = (input.fields[f.key] ?? '').trim();
      // An empty secret keeps the saved one (the browser never has it), if the provider is unchanged.
      if (!v && 'secret' in f && f.secret && current.provider === input.provider) {
        if (current.fields[f.key]) fields[f.key] = current.fields[f.key]!;
        continue;
      }
      if (v) fields[f.key] = v;
    }
    const next: PaymentRouteSettings = { provider: input.provider, fields };
    const problem = paymentSettingsProblem(route, next, this.deps.config);
    if (problem) {
      const missing = defs
        .filter((f) => 'required' in f && f.required && !fields[f.key])
        .map((f) => f.key);
      throw new ApiError('validation', problem, { field: 'fields', missing });
    }
    // Build first: a save that cannot produce a working provider is refused, not stored.
    try {
      applyPayments(this.deps, { ...s, [route]: next });
    } catch (e) {
      throw new ApiError('validation', (e as Error).message);
    }
    const configEnc = await encryptSecret(JSON.stringify(fields), this.deps.config.keyEncSecret);
    const now = this.deps.now();
    await this.deps.db
      .insert(paymentSettings)
      .values({ route, provider: next.provider, configEnc, updatedBy: userId, updatedAt: now })
      .onConflictDoUpdate({
        target: paymentSettings.route,
        set: { provider: next.provider, configEnc, updatedBy: userId, updatedAt: now },
      });
    this.appliedStamp = null;
    // §12: the audit trail names the fields that changed, never their values.
    const changed = defs
      .filter((f) => (current.fields[f.key] ?? '') !== (fields[f.key] ?? ''))
      .map((f) => f.key);
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: userId,
      action: 'ops.payments.update',
      entity: 'payment_settings',
      entityId: route,
      diff: { provider: { from: current.provider, to: next.provider }, changed },
    });
    return this.view(userId);
  }

  /** Back to the environment for one route (deletes the saved row). */
  async reset(userId: string, route: PaymentRoute): Promise<PaymentSettingsView> {
    await this.requireAdmin(userId);
    const { s } = await this.effective();
    try {
      applyPayments(this.deps, { ...s, [route]: this.env[route] });
    } catch (e) {
      throw new ApiError('validation', (e as Error).message);
    }
    await this.deps.db.delete(paymentSettings).where(eq(paymentSettings.route, route));
    this.appliedStamp = null;
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: userId,
      action: 'ops.payments.reset',
      entity: 'payment_settings',
      entityId: route,
    });
    return this.view(userId);
  }

  /**
   * Checks the live gateway answers to our key, without moving money (Snippe: the balance call).
   * `fake` has nothing to check.
   */
  async test(userId: string, route: PaymentRoute) {
    await this.requireAdmin(userId);
    const p = this.deps.payments;
    let ok = false;
    let status: number | null = null;
    let error: string | null = null;
    if (!p) error = 'Payments are off';
    else if (p instanceof SnippePaymentProvider) {
      try {
        const r = await p.ping();
        ok = r.ok;
        status = r.status;
        if (!ok)
          error =
            r.status === 401 || r.status === 403
              ? 'The API key was rejected'
              : `Snippe answered ${r.status}`;
      } catch (e) {
        error = (e as Error).message || 'failed';
      }
    } else error = 'This provider has nothing to test';
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: userId,
      action: 'ops.payments.test',
      entity: 'payment_settings',
      entityId: route,
      diff: { provider: p?.name ?? null, ok, status },
    });
    return { ok, provider: p?.name ?? null, status, error };
  }
}
