import { eq, max } from 'drizzle-orm';
import { messagingSettings, users } from '@harusi/db';
import {
  AfricasTalkingProvider,
  EvolutionWhatsAppProvider,
  FakeMessagingProvider,
  NextSmsProvider,
  WhatsAppCloudProvider,
  type MessagingProvider,
} from '@harusi/messaging';
import {
  MESSAGING_PROVIDERS,
  MESSAGING_ROUTES,
  providerFields,
  type MessagingRoute,
  type MessagingRouteView,
  type MessagingSettingsInput,
  type MessagingSettingsView,
} from '@harusi/schemas/messaging-settings';
import { allowedCountries, countryOfE164 } from '@harusi/schemas/country';
import { normalizePhone } from '@harusi/schemas/phone';
import type { Config } from '../config';
import type { Deps } from '../context';
import { decryptSecret, encryptSecret } from '../crypto-at-rest';
import { ApiError } from '../errors';
import { recordAudit } from './audit';
import { BrandingService } from './branding';
import { requireSettingsAdmin } from './staff-guard';

/** A route's provider and its fields (flat strings; secrets included). */
export interface RouteSettings {
  provider: string;
  fields: Record<string, string>;
}
export type MessagingSettings = Record<MessagingRoute, RouteSettings>;

const ROUTE_LABEL: Record<MessagingRoute, string> = {
  sms_tz: 'SMS (Tanzania)',
  sms_ke: 'SMS (Kenya)',
  whatsapp: 'WhatsApp',
};

const clean = (o: Record<string, string | null | undefined>): Record<string, string> =>
  Object.fromEntries(Object.entries(o).filter((e): e is [string, string] => !!e[1]));

/** What the environment variables say, in the same shape as a saved row (so one builder serves both). */
export function envSettings(config: Config): MessagingSettings {
  const wc = config.whatsappCloud;
  const ke = wc?.templatesByCountry.KE;
  return {
    sms_tz: {
      provider: config.smsProvider,
      fields: clean({ ...config.nextSms }),
    },
    sms_ke: {
      provider: config.smsProviderKe,
      fields: clean({ ...config.africasTalking }),
    },
    whatsapp: {
      provider: config.whatsappProvider,
      fields:
        config.whatsappProvider === 'evolution'
          ? clean({ ...config.evolution })
          : clean({
              token: wc?.token,
              phoneNumberId: wc?.phoneNumberId,
              apiVersion: wc?.apiVersion,
              verifyToken: wc?.verifyToken,
              appSecret: wc?.appSecret,
              templateInvite: wc?.templates.invite,
              templateReminder: wc?.templates.reminder,
              templatePledge: wc?.templates.pledge,
              templateContribution: wc?.templates.contribution,
              templateInviteKe: ke?.invite,
              templateReminderKe: ke?.reminder,
              templatePledgeKe: ke?.pledge,
              templateContributionKe: ke?.contribution,
            }),
    },
  };
}

/** Why a route's settings cannot be used, or null when they can. */
export function settingsProblem(route: MessagingRoute, s: RouteSettings): string | null {
  if (!(s.provider in MESSAGING_PROVIDERS[route]))
    return `Unknown ${ROUTE_LABEL[route]} provider "${s.provider}" (${Object.keys(MESSAGING_PROVIDERS[route]).join(' | ')})`;
  const missing = providerFields(route, s.provider)
    .filter((f) => 'required' in f && f.required && !s.fields[f.key])
    .map((f) => f.key);
  if (missing.length)
    return `${ROUTE_LABEL[route]} provider ${s.provider} needs ${missing.join(', ')}`;
  return null;
}

const templates = (f: Record<string, string>, suffix = '') => {
  const t = clean({
    invite: f[`templateInvite${suffix}`],
    reminder: f[`templateReminder${suffix}`],
    pledge: f[`templatePledge${suffix}`],
    contribution: f[`templateContribution${suffix}`],
  });
  return Object.keys(t).length ? t : undefined;
};

/** The config sections that describe the live providers (webhooks read them at request time). */
type ProviderConfig = Pick<
  Config,
  | 'smsProvider'
  | 'nextSms'
  | 'smsProviderKe'
  | 'africasTalking'
  | 'whatsappProvider'
  | 'evolution'
  | 'whatsappCloud'
>;

function configFor(s: MessagingSettings): ProviderConfig {
  const tz = s.sms_tz.fields;
  const ke = s.sms_ke.fields;
  const wa = s.whatsapp.fields;
  const keTemplates = templates(wa, 'Ke');
  return {
    smsProvider: s.sms_tz.provider,
    nextSms:
      s.sms_tz.provider === 'nextsms'
        ? { username: tz.username!, password: tz.password!, senderId: tz.senderId! }
        : null,
    smsProviderKe: s.sms_ke.provider,
    africasTalking:
      s.sms_ke.provider === 'africastalking'
        ? {
            username: ke.username!,
            apiKey: ke.apiKey!,
            senderId: ke.senderId || undefined,
            baseUrl: ke.baseUrl || undefined,
          }
        : null,
    whatsappProvider: s.whatsapp.provider,
    evolution:
      s.whatsapp.provider === 'evolution'
        ? { baseUrl: wa.baseUrl!.replace(/\/$/, ''), instance: wa.instance!, apiKey: wa.apiKey! }
        : null,
    whatsappCloud:
      s.whatsapp.provider === 'cloud'
        ? {
            token: wa.token!,
            phoneNumberId: wa.phoneNumberId!,
            apiVersion: wa.apiVersion || 'v21.0',
            verifyToken: wa.verifyToken || null,
            appSecret: wa.appSecret || null,
            templates: templates(wa) ?? {},
            templatesByCountry: keTemplates ? { KE: keTemplates } : {},
          }
        : null,
  };
}

export interface ApplyOptions {
  /** Wraps every SMS provider (DEV_LOG_OTP prints bodies in local development). */
  wrapSms?: (p: MessagingProvider) => MessagingProvider;
  log?: (line: Record<string, unknown>) => void;
}

/**
 * Builds the providers for these settings and swaps them into `deps`. Services read `deps.sms`,
 * `deps.whatsapp` and `deps.config.whatsappCloud` at call time, so a save takes effect on the next
 * message without a restart. Throws (and changes nothing) when a route's settings are incomplete.
 */
export function applyMessaging(deps: Deps, s: MessagingSettings, opts: ApplyOptions = {}) {
  for (const route of MESSAGING_ROUTES) {
    if (route === 'sms_ke' && !deps.config.kenyaEnabled) continue;
    const problem = settingsProblem(route, s[route]);
    if (problem) throw new Error(problem);
  }
  const cfg = configFor(s);
  const wrap = opts.wrapSms ?? ((p) => p);

  let sms: MessagingProvider = new FakeMessagingProvider('sms');
  let smsReport: Deps['smsReport'];
  if (cfg.nextSms) {
    const next = new NextSmsProvider(cfg.nextSms);
    sms = next;
    smsReport = (id) => next.report(id);
  }
  let whatsapp: MessagingProvider = new FakeMessagingProvider('whatsapp');
  if (cfg.evolution) whatsapp = new EvolutionWhatsAppProvider(cfg.evolution);
  if (cfg.whatsappCloud) {
    if (!cfg.whatsappCloud.templates.invite)
      opts.log?.({
        level: 'warn',
        msg: 'WhatsApp invite template not set: first-contact invitations will fail on WhatsApp and fall back to SMS',
      });
    whatsapp = new WhatsAppCloudProvider(cfg.whatsappCloud);
  }

  deps.sms = wrap(sms);
  deps.smsReport = smsReport;
  deps.whatsapp = whatsapp;
  // Kenyan numbers need their own SMS route (ADR 026); only built when Kenya is enabled.
  if (deps.config.kenyaEnabled) {
    const ke = cfg.africasTalking
      ? new AfricasTalkingProvider(cfg.africasTalking)
      : new FakeMessagingProvider('sms', undefined, 'fake-ke');
    deps.smsByCountry = { ...deps.smsByCountry, KE: wrap(ke) };
  }
  Object.assign(deps.config, cfg);
}

const hint = (v: string) => `…${v.slice(-4)}`;

/** Staff-only SMS and WhatsApp settings (ADR 031). Admin staff only: these hold provider secrets. */
export class MessagingSettingsService {
  /** `updated_at` of the newest row last applied, to skip no-op refreshes. */
  private appliedStamp: number | null = null;
  private readonly env: MessagingSettings;

  constructor(
    private deps: Deps,
    private opts: ApplyOptions = {},
  ) {
    this.env = envSettings(deps.config);
  }

  private requireAdmin(userId: string) {
    return requireSettingsAdmin(this.deps.db, userId);
  }

  private async rows() {
    const rows = await this.deps.db
      .select({ s: messagingSettings, by: users.name })
      .from(messagingSettings)
      .leftJoin(users, eq(users.id, messagingSettings.updatedBy));
    const out = new Map<
      MessagingRoute,
      { settings: RouteSettings; updatedAt: Date; updatedBy: string | null }
    >();
    for (const r of rows) {
      if (!(MESSAGING_ROUTES as readonly string[]).includes(r.s.route)) continue;
      const fields = JSON.parse(
        await decryptSecret(r.s.configEnc, this.deps.config.keyEncSecret),
      ) as Record<string, string>;
      out.set(r.s.route as MessagingRoute, {
        settings: { provider: r.s.provider, fields },
        updatedAt: r.s.updatedAt,
        updatedBy: r.by,
      });
    }
    return out;
  }

  /** Saved rows over the environment defaults. */
  private async effective() {
    const rows = await this.rows();
    const s = { ...this.env };
    for (const [route, r] of rows) s[route] = r.settings;
    return { s, rows };
  }

  /**
   * Loads saved settings into the live providers. Called at startup and every minute, so every API
   * instance picks up a save made on another one. A broken saved row is logged and the last good
   * providers keep running.
   */
  async refresh(force = false): Promise<void> {
    const [m] = await this.deps.db
      .select({ at: max(messagingSettings.updatedAt) })
      .from(messagingSettings);
    const stamp = m?.at ? new Date(m.at).getTime() : 0;
    if (!force && stamp === this.appliedStamp) return;
    try {
      const { s } = await this.effective();
      applyMessaging(this.deps, s, this.opts);
      this.appliedStamp = stamp;
    } catch (e) {
      this.opts.log?.({
        level: 'error',
        msg: 'messaging settings not applied',
        error: (e as Error).message,
      });
      this.appliedStamp = stamp; // do not retry a broken row every minute; a new save retries
    }
  }

  async view(userId: string): Promise<MessagingSettingsView> {
    await this.requireAdmin(userId);
    const { s, rows } = await this.effective();
    const active: Record<MessagingRoute, string | null> = {
      sms_tz: this.deps.sms.name,
      sms_ke: this.deps.smsByCountry?.KE?.name ?? null,
      whatsapp: this.deps.whatsapp?.name ?? null,
    };
    const routes: MessagingRouteView[] = MESSAGING_ROUTES.filter(
      (r) => r !== 'sms_ke' || this.deps.config.kenyaEnabled,
    ).map((route) => {
      const { provider, fields } = s[route];
      const defs = providerFields(route, provider);
      const plain: Record<string, string> = {};
      const secrets: Record<string, string> = {};
      for (const f of defs) {
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
        active: active[route],
        updatedAt: row?.updatedAt.toISOString() ?? null,
        updatedBy: row?.updatedBy ?? null,
      };
    });
    return {
      kenyaEnabled: this.deps.config.kenyaEnabled,
      routes,
      webhooks: [
        { route: 'whatsapp', provider: 'evolution', path: '/v1/webhooks/whatsapp' },
        { route: 'whatsapp', provider: 'cloud', path: '/v1/webhooks/whatsapp-cloud' },
        { route: 'sms_tz', provider: 'nextsms', path: '/v1/webhooks/sms' },
        ...(this.deps.config.kenyaEnabled
          ? [
              {
                route: 'sms_ke' as const,
                provider: 'africastalking',
                path: '/v1/webhooks/sms/africastalking?secret=<WEBHOOK_SECRET>',
              },
            ]
          : []),
      ],
    };
  }

  async save(
    userId: string,
    route: MessagingRoute,
    input: MessagingSettingsInput,
  ): Promise<MessagingSettingsView> {
    await this.requireAdmin(userId);
    if (route === 'sms_ke' && !this.deps.config.kenyaEnabled)
      throw new ApiError('validation', 'Kenya is not enabled', { field: 'route' });
    const { s } = await this.effective();
    const current = s[route];
    const defs = providerFields(route, input.provider);
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
    const next: RouteSettings = { provider: input.provider, fields };
    const problem = settingsProblem(route, next);
    if (problem) {
      const missing = defs
        .filter((f) => 'required' in f && f.required && !fields[f.key])
        .map((f) => f.key);
      throw new ApiError('validation', problem, { field: 'fields', missing });
    }

    // Build first: a save that cannot produce a working provider is refused, not stored.
    try {
      applyMessaging(this.deps, { ...s, [route]: next }, this.opts);
    } catch (e) {
      throw new ApiError('validation', (e as Error).message);
    }
    const configEnc = await encryptSecret(JSON.stringify(fields), this.deps.config.keyEncSecret);
    const now = this.deps.now();
    await this.deps.db
      .insert(messagingSettings)
      .values({ route, provider: next.provider, configEnc, updatedBy: userId, updatedAt: now })
      .onConflictDoUpdate({
        target: messagingSettings.route,
        set: { provider: next.provider, configEnc, updatedBy: userId, updatedAt: now },
      });
    this.appliedStamp = null; // the next refresh re-reads (cheap) and records the new stamp
    // §12: the audit trail names the fields that changed, never their values.
    const changed = defs
      .filter((f) => (current.fields[f.key] ?? '') !== (fields[f.key] ?? ''))
      .map((f) => f.key);
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: userId,
      action: 'ops.messaging.update',
      entity: 'messaging_settings',
      entityId: route,
      diff: { provider: { from: current.provider, to: next.provider }, changed },
    });
    return this.view(userId);
  }

  /** Back to the environment variables for one route (deletes the saved row). */
  async reset(userId: string, route: MessagingRoute): Promise<MessagingSettingsView> {
    await this.requireAdmin(userId);
    const { s } = await this.effective();
    try {
      applyMessaging(this.deps, { ...s, [route]: this.env[route] }, this.opts);
    } catch (e) {
      throw new ApiError('validation', (e as Error).message);
    }
    await this.deps.db.delete(messagingSettings).where(eq(messagingSettings.route, route));
    this.appliedStamp = null;
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: userId,
      action: 'ops.messaging.reset',
      entity: 'messaging_settings',
      entityId: route,
    });
    return this.view(userId);
  }

  /**
   * Moves the SMS and WhatsApp credentials from the environment into saved settings (ADR 036): each
   * route that has a working non-fake provider in the environment and nothing saved yet gets its
   * settings stored encrypted. Never overwrites what staff already saved. Afterwards the variables can
   * be deleted from the server; the saved settings keep working.
   */
  async importFromEnvironment(
    userId: string,
  ): Promise<MessagingSettingsView & { imported: MessagingRoute[] }> {
    await this.requireAdmin(userId);
    const saved = await this.rows();
    const imported: MessagingRoute[] = [];
    const now = this.deps.now();
    for (const route of MESSAGING_ROUTES) {
      if (route === 'sms_ke' && !this.deps.config.kenyaEnabled) continue;
      if (saved.has(route)) continue;
      const env = this.env[route];
      if (env.provider === 'fake' || settingsProblem(route, env)) continue;
      const configEnc = await encryptSecret(
        JSON.stringify(env.fields),
        this.deps.config.keyEncSecret,
      );
      await this.deps.db
        .insert(messagingSettings)
        .values({ route, provider: env.provider, configEnc, updatedBy: userId, updatedAt: now })
        .onConflictDoNothing({ target: messagingSettings.route });
      imported.push(route);
    }
    this.appliedStamp = null;
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: userId,
      action: 'ops.messaging.import_env',
      entity: 'messaging_settings',
      entityId: 'all',
      diff: { routes: imported },
    });
    return { ...(await this.view(userId)), imported };
  }

  /** Sends one test message through a route's live provider. */
  async test(userId: string, route: MessagingRoute, phone: string) {
    await this.requireAdmin(userId);
    const provider =
      route === 'whatsapp'
        ? this.deps.whatsapp
        : route === 'sms_ke'
          ? this.deps.smsByCountry?.KE
          : this.deps.sms;
    if (!provider) throw new ApiError('validation', 'This route is not available');
    const home = route === 'sms_ke' ? 'KE' : 'TZ';
    const n = normalizePhone(phone, home, allowedCountries(this.deps.config.kenyaEnabled));
    if (!n.ok) throw new ApiError('validation', 'Invalid phone number', { field: 'to' });
    const to = n.e164;
    if (route !== 'whatsapp' && countryOfE164(to) !== home)
      throw new ApiError('validation', 'The number does not belong to this route', {
        field: 'to',
      });
    const brand = await new BrandingService(this.deps).businessName();
    let error: string | null = null;
    try {
      await provider.send(
        to,
        route === 'sms_ke'
          ? `${brand}: test message. Your settings work.`
          : `${brand}: ujumbe wa majaribio. Mipangilio yako inafanya kazi.`,
      );
    } catch (e) {
      error = (e as Error).message || 'failed';
    }
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: userId,
      action: 'ops.messaging.test',
      entity: 'messaging_settings',
      entityId: route,
      // §12: never a full phone number in the log
      diff: { to: `…${to.slice(-3)}`, provider: provider.name, ok: !error },
    });
    return { ok: !error, provider: provider.name, error };
  }
}
