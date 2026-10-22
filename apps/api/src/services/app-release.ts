import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { recordAudit } from './audit';
import { requireSettingsAdmin, type StaffCaller } from './staff-guard';

export interface AndroidRelease {
  version: string;
  size: number;
  sha256: string;
  uploadedAt: string;
}

const APK = 'kadi-sasa.apk';
const META = 'android.json';
const MIN_BYTES = 1_000_000;
const MAX_BYTES = 150_000_000;
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/**
 * The Android app served from our own domain (ADR 047). Admin staff upload the signed APK in /ops; it is
 * kept on a persistent volume (`APP_FILES_DIR`) and downloaded from kadisasa.com/programu/kadi-sasa.apk.
 * The file is replaced atomically, so a download in progress never gets half of two versions.
 */
export class AppReleaseService {
  constructor(private deps: Deps) {}

  private get dir() {
    return resolve(this.deps.config.appFilesDir ?? 'data/app-files');
  }

  async current(): Promise<AndroidRelease | null> {
    try {
      const meta = JSON.parse(await readFile(join(this.dir, META), 'utf8')) as AndroidRelease;
      await stat(join(this.dir, APK));
      return meta;
    } catch {
      return null;
    }
  }

  /** The file to stream, with its details, or null when no app has been uploaded. */
  async file() {
    const meta = await this.current();
    return meta ? { meta, stream: () => createReadStream(join(this.dir, APK)) } : null;
  }

  async upload(caller: StaffCaller, bytes: Uint8Array, version: string): Promise<AndroidRelease> {
    await requireSettingsAdmin(this.deps.db, caller);
    const v = version.trim();
    if (!/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(v))
      throw new ApiError('validation', 'Version must look like 1.2.3', { field: 'version' });
    if (bytes.length < MIN_BYTES || bytes.length > MAX_BYTES)
      throw new ApiError('validation', 'The file must be between 1 MB and 150 MB', {
        field: 'file',
      });
    // An APK is a zip with an AndroidManifest.xml entry; anything else is refused.
    const isZip = ZIP_MAGIC.every((b, i) => bytes[i] === b);
    if (!isZip || !Buffer.from(bytes).includes('AndroidManifest.xml'))
      throw new ApiError('validation', 'This is not an Android app (.apk)', { field: 'file' });

    const meta: AndroidRelease = {
      version: v,
      size: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      uploadedAt: this.deps.now().toISOString(),
    };
    await mkdir(this.dir, { recursive: true });
    const tmp = join(this.dir, `.${APK}.${process.pid}.tmp`);
    await writeFile(tmp, bytes);
    await rename(tmp, join(this.dir, APK));
    await writeFile(join(this.dir, `.${META}.tmp`), JSON.stringify(meta));
    await rename(join(this.dir, `.${META}.tmp`), join(this.dir, META));
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: caller.userId,
      action: 'ops.app.upload',
      entity: 'app_release',
      entityId: 'android',
      diff: { ...meta },
    });
    return meta;
  }

  /** Takes the download down; /programu goes back to "coming soon". */
  async remove(caller: StaffCaller): Promise<void> {
    await requireSettingsAdmin(this.deps.db, caller);
    await rm(join(this.dir, META), { force: true });
    await rm(join(this.dir, APK), { force: true });
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: caller.userId,
      action: 'ops.app.remove',
      entity: 'app_release',
      entityId: 'android',
    });
  }
}
