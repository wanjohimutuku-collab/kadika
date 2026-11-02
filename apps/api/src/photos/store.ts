import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import type { Deps } from '../context';

/** Where Kumbukumbu photos live (ADR 050). Keys are built by the server, never from user input. */
export interface PhotoStore {
  put(key: string, bytes: Uint8Array): Promise<void>;
  /** The bytes, or null when there is no such file. */
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

/** A persistent volume (`PHOTO_FILES_DIR`), like the Android APK in ADR 047. Writes are atomic. */
export class DiskPhotoStore implements PhotoStore {
  private readonly root: string;
  constructor(root: string) {
    this.root = resolve(root);
  }

  private path(key: string) {
    const p = resolve(join(this.root, key));
    if (!p.startsWith(this.root + sep)) throw new Error('photo key escapes the store');
    return p;
  }

  async put(key: string, bytes: Uint8Array) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    const tmp = `${p}.${process.pid}.tmp`;
    await writeFile(tmp, bytes);
    await rename(tmp, p);
  }

  async get(key: string) {
    try {
      return new Uint8Array(await readFile(this.path(key)));
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    await rm(this.path(key), { force: true });
  }
}

/** In-memory store for tests and local dev (§12). */
export class MemoryPhotoStore implements PhotoStore {
  readonly files = new Map<string, Uint8Array>();
  async put(key: string, bytes: Uint8Array) {
    this.files.set(key, bytes);
  }
  async get(key: string) {
    return this.files.get(key) ?? null;
  }
  async delete(key: string) {
    this.files.delete(key);
  }
}

let disk: DiskPhotoStore | undefined;
/** The deps' store, or the disk volume at `PHOTO_FILES_DIR`. */
export function photosOf(deps: Deps): PhotoStore {
  return deps.photos ?? (disk ??= new DiskPhotoStore(deps.config.photoFilesDir));
}
