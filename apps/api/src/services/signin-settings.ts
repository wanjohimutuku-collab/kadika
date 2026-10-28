import { eq, max } from 'drizzle-orm';
import { signinSettings, users } from '@harusi/db';
import {
  FIREBASE_FIELDS,
  SIGNIN_PROVIDERS,
  type SignInProvider,
  type SignInSettingsInput,
  type SignInSettingsView,
  type SignInTestResult,
} from '@harusi/schemas/signin-settings';
import type { Config } from '../config';
import type { Deps } from '../context';
import { decryptSecret, encryptSecret } from '../crypto-at-rest';
import { ApiError } from '../errors';
import { recordAudit } from './audit';
import { requireSettingsAdmin, type StaffCaller } from './staff-guard';

const ROW_ID = 'default';
/** Firebase's own lookup of the project behind a web API key (what the JS SDK calls). */
const PROJECT_CONFIG_URL = 'https://identitytoolkit.googleapis.com/v1/projects';

export type FirebaseWebConfig = NonNullable<Config['firebase']>;

/** Who sends login codes right now, and the Firebase project (also usable while on `sms`). */
export interface SignInState {
  provider: SignInProvider;
  firebase: FirebaseWebConfig | null;
}

/** The saved row as stored: the provider and the Firebase fields (flat strings, API key included). */
interface SavedSignIn {
  provider: SignInProvider;
  fields: Record<string, string>;
}

/** What the environment says (AUTH_OTP_PROVIDER, FIREBASE_*): the first-start fallback. */
export function envSignIn(config: Pick<Config, 'authOtpProvider' | 'firebase'>): SignInState {
  return { provider: config.authOtpProvider, firebase: config.firebase };
}

/**
 * The sign-in settings in effect: saved in /ops, else the environment. `AUTH_FORCE_SMS=1` keeps codes
 * on SMS whatever is saved, so a broken Firebase setup can never lock staff out of /ops.
 */
export function signInOf(deps: Pick<Deps, 'config' | 'signIn'>): SignInState {
  const s = deps.signIn ?? envSignIn(deps.config);
  return deps.config.authForceSms ? { ...s, provider: 'sms' } : s;
}

const fieldsOf = (fb: FirebaseWebConfig | null): Record<string, string> =>
  fb
    ? Object.fromEntries(
        Object.entries({
          projectId: fb.projectId,
          apiKey: fb.apiKey,
          appId: fb.appId,
          authDomain: fb.authDomain,
        }).filter((e): e is [string, string] => !!e[1]),
      )
    : {};

function firebaseOf(fields: Record<string, string>): FirebaseWebConfig | null {
  if (!fields.projectId) return null;
  return {
    projectId: fields.projectId,
    apiKey: fields.apiKey || null,
    appId: fields.appId || null,
    authDomain: fields.authDomain || `${fields.projectId}.firebaseapp.com`,
  };
}

/** Why these settings cannot be used, or null when they can. */
export function signInProblem(s: SavedSignIn): { message: string; missing?: string[] } | null {
  if (!(SIGNIN_PROVIDERS as readonly string[]).includes(s.provider))
    return {
      message: `Unknown sign-in provider "${s.provider}" (${SIGNIN_PROVIDERS.join(' | ')})`,
    };
  const f = s.fields;
  if (f.projectId && !/^[a-z0-9][a-z0-9-]{4,38}[a-z0-9]$/.test(f.projectId))
    return { message: 'projectId is not a Firebase project id' };
  if (f.authDomain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(f.authDomain))
    return { message: 'authDomain must be a host name such as kadi-sasa.firebaseapp.com' };
  if (s.provider === 'firebase') {
    // The browser needs all three to start Firebase; the API needs the project to check tokens.
    const missing = FIREBASE_FIELDS.filter((d) => 'required' in d && d.required && !f[d.key]).map(
      (d) => d.key,
    );
    if (missing.length) return { message: `Firebase sign-in needs ${missing.join(', ')}`, missing };
  }
  return null;
}

const hint = (v: string) => `…${v.slice(-4)}`;

/** Admin-staff sign-in settings (ADR 049): encrypted at rest, audit-logged, env as fallback. */
export class SignInSettingsService {
  private appliedStamp: number | null = null;

  constructor(
    private deps: Deps,
    private opts: { log?: (line: Record<string, unknown>) => void } = {},
  ) {}

  private async row() {
    const [r] = await this.deps.db
      .select({ s: signinSettings, by: users.name })
      .from(signinSettings)
      .leftJoin(users, eq(users.id, signinSettings.updatedBy))
      .where(eq(signinSettings.id, ROW_ID));
    if (!r) return null;
    const fields = JSON.parse(
      await decryptSecret(r.s.configEnc, this.deps.config.keyEncSecret),
    ) as Record<string, string>;
    return {
      saved: { provider: r.s.provider as SignInProvider, fields },
      updatedAt: r.s.updatedAt,
      updatedBy: r.by,
    };
  }

  private async effective(): Promise<{
    saved: SavedSignIn;
    row: Awaited<ReturnType<SignInSettingsService['row']>>;
  }> {
    const row = await this.row();
    const env = envSignIn(this.deps.config);
    return { saved: row?.saved ?? { provider: env.provider, fields: fieldsOf(env.firebase) }, row };
  }

  private apply(s: SavedSignIn) {
    const problem = signInProblem(s);
    if (problem) throw new Error(problem.message);
    this.deps.signIn = { provider: s.provider, firebase: firebaseOf(s.fields) };
  }

  /**
   * Loads the saved settings into `deps.signIn`. Called at startup and every minute, so a save on one
   * API instance reaches the others. A broken saved row is logged and the last good settings stay.
   */
  async refresh(force = false): Promise<void> {
    const [m] = await this.deps.db
      .select({ at: max(signinSettings.updatedAt) })
      .from(signinSettings);
    const stamp = m?.at ? new Date(m.at).getTime() : 0;
    if (!force && stamp === this.appliedStamp) return;
    try {
      const row = await this.row();
      if (row) this.apply(row.saved);
      else this.deps.signIn = undefined; // back to the environment
    } catch (e) {
      this.opts.log?.({
        level: 'error',
        msg: 'sign-in settings not applied',
        error: (e as Error).message,
      });
    }
    this.appliedStamp = stamp;
  }

  async view(caller: StaffCaller): Promise<SignInSettingsView> {
    await requireSettingsAdmin(this.deps.db, caller);
    const { saved, row } = await this.effective();
    const fields: Record<string, string> = {};
    const secrets: Record<string, string> = {};
    for (const f of FIREBASE_FIELDS) {
      const v = saved.fields[f.key];
      if (!v) continue;
      if ('secret' in f && f.secret) secrets[f.key] = hint(v);
      else fields[f.key] = v;
    }
    return {
      provider: saved.provider,
      active: signInOf(this.deps).provider,
      forcedSms: this.deps.config.authForceSms,
      source: row ? 'database' : 'environment',
      fields,
      secrets,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      updatedBy: row?.updatedBy ?? null,
    };
  }

  async save(caller: StaffCaller, input: SignInSettingsInput): Promise<SignInSettingsView> {
    await requireSettingsAdmin(this.deps.db, caller);
    const { saved: current } = await this.effective();
    const fields: Record<string, string> = {};
    for (const f of FIREBASE_FIELDS) {
      const v = (input.fields[f.key] ?? '').trim();
      // An empty API key keeps the saved one (the browser is only ever shown its last 4 characters).
      if (!v && 'secret' in f && f.secret) {
        if (current.fields[f.key]) fields[f.key] = current.fields[f.key]!;
        continue;
      }
      if (v) fields[f.key] = v;
    }
    const next: SavedSignIn = { provider: input.provider, fields };
    const problem = signInProblem(next);
    if (problem)
      throw new ApiError('validation', problem.message, {
        field: 'fields',
        missing: problem.missing ?? [],
      });
    const configEnc = await encryptSecret(JSON.stringify(fields), this.deps.config.keyEncSecret);
    const now = this.deps.now();
    await this.deps.db
      .insert(signinSettings)
      .values({
        id: ROW_ID,
        provider: next.provider,
        configEnc,
        updatedBy: caller.userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: signinSettings.id,
        set: { provider: next.provider, configEnc, updatedBy: caller.userId, updatedAt: now },
      });
    this.apply(next);
    this.appliedStamp = null;
    // §12: the audit trail names the fields that changed, never their values.
    const changed = FIREBASE_FIELDS.filter(
      (f) => (current.fields[f.key] ?? '') !== (fields[f.key] ?? ''),
    ).map((f) => f.key);
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: caller.userId,
      action: 'ops.signin.update',
      entity: 'signin_settings',
      entityId: ROW_ID,
      diff: { provider: { from: current.provider, to: next.provider }, changed },
    });
    return this.view(caller);
  }

  /** Back to the environment variables (deletes the saved row). */
  async reset(caller: StaffCaller): Promise<SignInSettingsView> {
    await requireSettingsAdmin(this.deps.db, caller);
    await this.deps.db.delete(signinSettings).where(eq(signinSettings.id, ROW_ID));
    this.deps.signIn = undefined;
    this.appliedStamp = null;
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: caller.userId,
      action: 'ops.signin.reset',
      entity: 'signin_settings',
      entityId: ROW_ID,
    });
    return this.view(caller);
  }

  /**
   * Asks Firebase which project the saved API key belongs to and which domains may sign in. Nothing is
   * sent to any phone. Works before switching, so the setup can be checked while codes still go by SMS.
   */
  async test(caller: StaffCaller): Promise<SignInTestResult> {
    await requireSettingsAdmin(this.deps.db, caller);
    const { saved } = await this.effective();
    const fb = firebaseOf(saved.fields);
    const result = (r: Partial<SignInTestResult>): SignInTestResult => ({
      ok: false,
      error: null,
      projectId: null,
      authorizedDomains: [],
      missingDomains: [],
      ...r,
    });
    let out: SignInTestResult;
    if (!fb?.apiKey) out = result({ error: 'Save the Firebase project id and API key first' });
    else {
      try {
        const res = await fetch(`${PROJECT_CONFIG_URL}?key=${encodeURIComponent(fb.apiKey)}`, {
          signal: AbortSignal.timeout(10_000),
        });
        const body = (await res.json().catch(() => null)) as {
          projectId?: string;
          authorizedDomains?: string[];
          error?: { message?: string };
        } | null;
        if (!res.ok)
          out = result({ error: body?.error?.message ?? `Firebase answered ${res.status}` });
        else {
          const authorizedDomains = body?.authorizedDomains ?? [];
          const missingDomains = this.webHosts().filter((h) => !authorizedDomains.includes(h));
          const projectId = body?.projectId ?? null;
          const wrongProject = projectId !== null && projectId !== fb.projectId;
          out = result({
            ok: !wrongProject && missingDomains.length === 0,
            error: wrongProject
              ? `The API key belongs to project ${projectId}, not ${fb.projectId}`
              : missingDomains.length
                ? `Add ${missingDomains.join(', ')} to the authorized domains in Firebase`
                : null,
            projectId,
            authorizedDomains,
            missingDomains,
          });
        }
      } catch (e) {
        out = result({ error: (e as Error).message || 'Firebase could not be reached' });
      }
    }
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: caller.userId,
      action: 'ops.signin.test',
      entity: 'signin_settings',
      entityId: ROW_ID,
      diff: { ok: out.ok, missingDomains: out.missingDomains },
    });
    return out;
  }

  /** The hosts our login pages run on: the browser origins this API accepts, minus local ones. */
  private webHosts(): string[] {
    const hosts = new Set<string>();
    for (const o of this.deps.config.corsOrigins) {
      try {
        const h = new URL(o).hostname;
        if (h !== 'localhost' && h !== '127.0.0.1' && !h.endsWith('.localhost')) hosts.add(h);
      } catch {
        // not a URL: ignore
      }
    }
    return [...hosts];
  }
}
