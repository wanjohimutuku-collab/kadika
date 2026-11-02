# Kumbukumbu (photo memories page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Once an event has a paid card order, the host and committee can post up to 30 captioned, dated photos, and each guest views them at `/c/<token>/kumbukumbu` from a link the host shares on WhatsApp or that we send.

**Architecture:** A new `memories` table plus a `PhotoStore` interface (disk volume in production, memory in tests). Uploads are re-encoded to WebP with `sharp`, which also strips all metadata. A `MemoriesService` owns unlock checks, limits, CRUD and the guest view; guest access reuses the card token. Delivery gains a `memories` message kind that spends reminder credits under ADR 042. The guest page is a plain-HTML route like the card (ADR 014). The console and mobile app get a Kumbukumbu screen.

**Tech Stack:** Hono + zod, Drizzle (Postgres; PGlite in tests), Vitest, `sharp`, Next.js route handlers, React Query, Expo Router + `expo-image-picker`.

**Spec:** `docs/superpowers/specs/2026-11-03-memories-page-design.md`. Where this plan differs from the spec, the plan wins (see "Changes from the spec" below).

## Global Constraints

- Unlock = a row in `event_purchases` with `kind = 'cards'` and `status = 'paid'`. Packs and grants never unlock.
- Default limit **30** per event (`events.memories_limit`); staff with the `plan` permission change it.
- Caption ≤ **140** characters; `taken_on` is a date (`YYYY-MM-DD`).
- Uploads: JPEG, PNG or WebP, ≤ **8 MB** (8 × 1024 × 1024 bytes), checked from the bytes.
- Output: full-size WebP longest side **1280 px**, quality **78**; thumbnail longest side **320 px**, quality **70**; **no metadata**.
- Upload/edit/delete: owner and committee. `gate` gets 403.
- Guest routes: card token, rate-limited with the existing `cardReads` limiter; photo responses `cache-control: private, max-age=86400`, `content-type: image/webp`, `x-content-type-options: nosniff`.
- Our send of the link: message kind `memories`, **1 reminder credit per non-failed message** (automatic: `dispatch` charges every kind not in `CARD_DELIVERY_KINDS`).
- Error codes are the existing set in `apps/api/src/errors.ts`; reasons go in `details.reason`.
- Never log tokens or links built from them.
- Swahili first; every new string in both `sw.json` and `en.json`.
- Conventional Commits; each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Changes from the spec (found while reading the code)

1. **No HEIC.** The prebuilt `sharp` binaries cannot decode HEIC. Phones hand browsers and `expo-image-picker` JPEG anyway; HEIC is refused like any other non-image.
2. **Error codes.** `ApiErrorCode` is a fixed set. "invalid_image" → `400 validation` with `details.reason = 'invalid_image'`; "memories_unavailable" → `404 not_found` with `details.reason = 'memories_unavailable'`; "no_invitation" → `409 conflict` with `details.reason = 'no_invitation'`; "no_memories" → `400 validation` with `details.reason = 'no_memories'`; "feature_locked" → `402 payment_required` with `details.reason = 'feature_locked'`.
3. **Events are soft-deleted** (`EventsService.remove` sets `deleted_at`). So deleting an event deletes its memory rows and files explicitly; it is not a database cascade.

## File map

| File | Responsibility |
|---|---|
| `packages/db/src/schema.ts` (modify) | `memories` table; `events.memories_enabled`, `events.memories_limit` |
| `packages/db/drizzle/0026_memories.sql` (generated) | migration |
| `apps/api/src/photos/store.ts` (create) | `PhotoStore`, `DiskPhotoStore`, `MemoryPhotoStore` |
| `apps/api/src/photos/process.ts` (create) | `processPhoto(bytes)` via sharp |
| `apps/api/src/services/memories.ts` (create) | unlock, limit, CRUD, guest view, purge |
| `apps/api/src/services/cards.ts` (modify) | `resolveToken(token)` |
| `apps/api/src/services/delivery.ts` (modify) | `sendMemories`, `memoriesLink` |
| `apps/api/src/services/messages.ts` (modify) | `composeSms('memories', …)` |
| `apps/api/src/app.ts` (modify) | routes |
| `apps/api/src/config.ts`, `context.ts`, `index.ts`, `testing/test-app.ts` (modify) | `PHOTO_FILES_DIR`, `deps.photos`, template env |
| `packages/messaging/src/index.ts`, `whatsapp-cloud.ts` (modify) | template kind `memories` |
| `apps/api/src/memories.test.ts`, `photos.test.ts` (create) | API tests |
| `packages/api-client/src/{types,repository,http-repository}.ts`, `mock/mock-repository.ts` (modify) | client |
| `packages/i18n/src/{sw,en}.json` (modify) | strings |
| `apps/web/src/lib/light-card/memories.ts` (create), `render.ts` (modify) | guest page HTML |
| `apps/web/app/c/[token]/kumbukumbu/route.ts`, `apps/web/app/s/[code]/k/page.tsx` (create) | guest routes |
| `apps/web/app/app/e/[id]/kumbukumbu/page.tsx` (create), `components/console/shell.tsx`, guest detail, send page (modify) | console |
| `apps/mobile/app/(app)/event/[id]/memories.tsx` (create), guest detail (modify) | mobile |
| `docs/adr/050-memories-page.md`, privacy page, `infra/coolify/` note (create/modify) | docs |

---

### Task 1: Database: `memories` table and event columns

**Files:**
- Modify: `packages/db/src/schema.ts` (events table near line 126; new table at the end)
- Create (generated): `packages/db/drizzle/0026_memories.sql` and its `meta` entries
- Test: `apps/api/src/memories.test.ts` (first test only)

**Interfaces:**
- Produces: `memories` table export `memories` from `@harusi/db` with columns `id, eventId, photoKey, thumbKey, width, height, caption, takenOn (string | null, 'YYYY-MM-DD'), sortOrder, createdBy, createdAt, updatedAt`; `events.memoriesEnabled: boolean`, `events.memoriesLimit: number`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/memories.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { events, memories } from '@harusi/db';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

let seq = 0;
async function setup() {
  const phone = `07881${String(++seq).padStart(5, '0')}`;
  const owner = await loginAs(ctx, phone);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: { title: 'Harusi', coupleNames: 'Asha & Juma', dateStart: '2027-06-01T10:00:00+03:00' },
    })
  ).body!;
  const g = (
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Bibi Pendo', phone: `0714${String(500000 + seq)}`, language: 'sw' },
    })
  ).body! as { id: string; cardToken: string };
  return { t, owner, evId: ev.id as string, g };
}

describe('memories schema', () => {
  it('new events have the page on with a limit of 30, and no memories', async () => {
    const { evId } = await setup();
    const [e] = await ctx.db.select().from(events).where(eq(events.id, evId));
    expect(e).toMatchObject({ memoriesEnabled: true, memoriesLimit: 30 });
    expect(await ctx.db.select().from(memories).where(eq(memories.eventId, evId))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @harusi/api exec vitest run src/memories.test.ts`
Expected: FAIL, `memories` is not exported from `@harusi/db`.

- [ ] **Step 3: Add the columns and table**

In `packages/db/src/schema.ts`, in the `events` table right after `pledgesEnabled`:

```ts
  /** Kumbukumbu (ADR 050): the host can hide the page without deleting photos. */
  memoriesEnabled: boolean('memories_enabled').notNull().default(true),
  /** Most photos the page may hold; staff with the `plan` permission change it. */
  memoriesLimit: integer('memories_limit').notNull().default(30),
```

At the end of the file (add `date` to the `drizzle-orm/pg-core` import if it is not there):

```ts
/**
 * Kumbukumbu (ADR 050): the couple's past photos, shown to their guests by card token. Files live in
 * the `PhotoStore`; these rows hold only keys, never anything built from user input.
 */
export const memories = pgTable(
  'memories',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    photoKey: text('photo_key').notNull(),
    thumbKey: text('thumb_key').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    caption: text('caption'),
    takenOn: date('taken_on', { mode: 'string' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('memories_event_idx').on(t.eventId, t.sortOrder)],
);
```

- [ ] **Step 4: Generate the migration**

Run: `pnpm --filter @harusi/db generate --name memories`
Expected: a new `packages/db/drizzle/0026_memories.sql` with `CREATE TABLE "memories"`, two `ALTER TABLE "events" ADD COLUMN` lines, the FKs and the index. Open it and check nothing else changed.

- [ ] **Step 5: Run the test**

Run: `pnpm --filter @harusi/api exec vitest run src/memories.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema.ts packages/db/drizzle apps/api/src/memories.test.ts
git commit -m "feat(db): memories table and per-event memories switch and limit"
```

---

### Task 2: Photo storage and processing

**Files:**
- Create: `apps/api/src/photos/store.ts`, `apps/api/src/photos/process.ts`
- Modify: `apps/api/package.json` (add `sharp`), `apps/api/tsup.config.ts` (mark `sharp` external), `apps/api/src/config.ts`, `apps/api/src/context.ts`, `apps/api/src/index.ts`, `apps/api/src/testing/test-app.ts`, `.env.example`
- Test: `apps/api/src/photos.test.ts`

**Interfaces:**
- Produces:
  - `interface PhotoStore { put(key: string, bytes: Uint8Array): Promise<void>; get(key: string): Promise<Uint8Array | null>; delete(key: string): Promise<void> }`
  - `class DiskPhotoStore implements PhotoStore { constructor(root: string) }`
  - `class MemoryPhotoStore implements PhotoStore { readonly files: Map<string, Uint8Array> }`
  - `processPhoto(bytes: Uint8Array): Promise<{ full: Uint8Array; thumb: Uint8Array; width: number; height: number }>` which throws `ApiError('validation', …, { reason: 'invalid_image' | 'too_large', field: 'photo' })`
  - `Deps.photos?: PhotoStore`; `Config.photoFilesDir: string`
  - `photosOf(deps: Deps): PhotoStore` returns `deps.photos` or a `DiskPhotoStore(config.photoFilesDir)`
  - Test context exposes `ctx.photos: MemoryPhotoStore`

- [ ] **Step 1: Add sharp**

Run: `pnpm --filter @harusi/api add sharp@^0.34`
Then in `apps/api/tsup.config.ts`, add `'sharp'` to `external` (create the array if missing) so the native module is not bundled. Check `infra/docker/Dockerfile.api` copies `node_modules` for the runtime stage. If the runtime image is Alpine, sharp's prebuilt `linuxmusl` binary covers it; no apk packages needed.

- [ ] **Step 2: Write the failing tests**

Create `apps/api/src/photos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processPhoto } from './photos/process';
import { MemoryPhotoStore } from './photos/store';

/** A real JPEG with EXIF (GPS and camera fields) and orientation 6 (rotate 90°), 400×200 as stored. */
async function jpegWithExif() {
  return new Uint8Array(
    await sharp({ create: { width: 400, height: 200, channels: 3, background: '#0F5C4D' } })
      .withExif({
        IFD0: { Make: 'TestCam', Orientation: '6' },
        IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '6/1 48/1 0/1' },
      })
      .jpeg()
      .toBuffer(),
  );
}

describe('processPhoto', () => {
  it('writes WebP with no metadata, upright, within 1280 and 320 px', async () => {
    const out = await processPhoto(await jpegWithExif());
    const full = await sharp(out.full).metadata();
    const thumb = await sharp(out.thumb).metadata();
    expect(full.format).toBe('webp');
    expect(full.exif).toBeUndefined();
    expect(full.icc).toBeUndefined();
    expect(full.xmp).toBeUndefined();
    // orientation 6 means the 400×200 pixels are shown as 200×400
    expect({ w: out.width, h: out.height }).toEqual({ w: 200, h: 400 });
    expect(Math.max(thumb.width!, thumb.height!)).toBeLessThanOrEqual(320);
  });

  it('shrinks big photos to 1280 px on the longest side', async () => {
    const big = new Uint8Array(
      await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#fff' } })
        .png()
        .toBuffer(),
    );
    const out = await processPhoto(big);
    expect({ w: out.width, h: out.height }).toEqual({ w: 1280, h: 853 });
  });

  it('refuses a file that is not an image as invalid_image', async () => {
    await expect(processPhoto(new TextEncoder().encode('not a photo at all'))).rejects.toMatchObject({
      code: 'validation',
      details: { reason: 'invalid_image' },
    });
  });

  it('refuses more than 8 MB before decoding', async () => {
    await expect(processPhoto(new Uint8Array(8 * 1024 * 1024 + 1))).rejects.toMatchObject({
      details: { reason: 'too_large' },
    });
  });
});

describe('MemoryPhotoStore', () => {
  it('puts, gets and deletes', async () => {
    const s = new MemoryPhotoStore();
    await s.put('events/e/m.webp', new Uint8Array([1, 2]));
    expect(await s.get('events/e/m.webp')).toEqual(new Uint8Array([1, 2]));
    await s.delete('events/e/m.webp');
    expect(await s.get('events/e/m.webp')).toBeNull();
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm --filter @harusi/api exec vitest run src/photos.test.ts`
Expected: FAIL, cannot resolve `./photos/process`.

- [ ] **Step 4: Write the store**

`apps/api/src/photos/store.ts`:

```ts
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
export function photosOf(deps: Deps): PhotoStore {
  return deps.photos ?? (disk ??= new DiskPhotoStore(deps.config.photoFilesDir));
}
```

- [ ] **Step 5: Write the processor**

`apps/api/src/photos/process.ts`:

```ts
import sharp from 'sharp';
import { ApiError } from '../errors';

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ACCEPTED = new Set(['jpeg', 'png', 'webp']);

const invalid = () =>
  new ApiError('validation', 'This file is not a photo we can use', {
    reason: 'invalid_image',
    field: 'photo',
  });

/**
 * Re-encodes an uploaded photo (ADR 050): turned upright from its EXIF orientation, then written as
 * WebP with **no metadata at all**, so a phone photo never reveals where it was taken.
 */
export async function processPhoto(bytes: Uint8Array) {
  if (bytes.length > MAX_PHOTO_BYTES)
    throw new ApiError('validation', 'Photos can be at most 8 MB', {
      reason: 'too_large',
      field: 'photo',
    });
  let format: string | undefined;
  try {
    format = (await sharp(bytes).metadata()).format;
  } catch {
    throw invalid();
  }
  if (!format || !ACCEPTED.has(format)) throw invalid();
  try {
    // sharp drops all metadata unless asked to keep it; rotate() applies the EXIF orientation first.
    const full = await sharp(bytes)
      .rotate()
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await sharp(bytes)
      .rotate()
      .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    return {
      full: new Uint8Array(full.data),
      thumb: new Uint8Array(thumb),
      width: full.info.width,
      height: full.info.height,
    };
  } catch {
    throw invalid();
  }
}
```

- [ ] **Step 6: Wire config and deps**

`apps/api/src/config.ts`, in the `Config` type next to `appFilesDir`:

```ts
  /** Kumbukumbu photos (ADR 050): a persistent volume. */
  photoFilesDir: string;
```

and in `loadConfig`'s returned object, after `appFilesDir`:

```ts
    photoFilesDir: env.PHOTO_FILES_DIR ?? 'data/photo-files',
```

`apps/api/src/context.ts`: add `import type { PhotoStore } from './photos/store';` and in `Deps`:

```ts
  /** Kumbukumbu photo files (ADR 050); a disk store at `PHOTO_FILES_DIR` when absent. */
  photos?: PhotoStore;
```

`apps/api/src/testing/test-app.ts`: import `MemoryPhotoStore` from `'../photos/store'`, create `const photos = new MemoryPhotoStore();` before `deps`, add `photos,` to `deps`, and add `photos,` to the returned object.

`.env.example`: add `PHOTO_FILES_DIR=data/photo-files` under `APP_FILES_DIR`.

(`index.ts` needs no change: `photosOf` falls back to the disk store.)

- [ ] **Step 7: Run the tests**

Run: `pnpm --filter @harusi/api exec vitest run src/photos.test.ts`
Expected: PASS (5 tests). If `withExif` is missing, the installed sharp is older than 0.33; use `^0.34`.

- [ ] **Step 8: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/tsup.config.ts apps/api/src/photos apps/api/src/photos.test.ts apps/api/src/config.ts apps/api/src/context.ts apps/api/src/testing/test-app.ts .env.example
git commit -m "feat(api): photo store and WebP re-encoding that strips location data"
```

---

### Task 3: MemoriesService and the organizer routes

**Files:**
- Create: `apps/api/src/services/memories.ts`
- Modify: `apps/api/src/app.ts` (service construction near line 197; routes after the events routes near line 562)
- Test: `apps/api/src/memories.test.ts`

**Interfaces:**
- Consumes: `photosOf`, `processPhoto` (Task 2); `EventsService.role(eventId, userId): Promise<'owner'|'committee'|'gate'>`; `recordAudit` from `./audit`.
- Produces (`MemoriesService`, constructed as `new MemoriesService(deps, eventsSvc)`):
  - `unlocked(eventId: string): Promise<boolean>`
  - `list(eventId, userId): Promise<MemoriesAdminView>` where `MemoriesAdminView = { unlocked: boolean; enabled: boolean; limit: number; count: number; memories: MemoryView[] }`
  - `MemoryView = { id: string; caption: string | null; takenOn: string | null; sortOrder: number; width: number; height: number }`
  - `add(eventId, userId, bytes: Uint8Array, input: { caption?: string | null; takenOn?: string | null }): Promise<MemoryView>`
  - `update(memoryId, userId, patch: { caption?: string | null; takenOn?: string | null; sortOrder?: number }): Promise<MemoryView>`
  - `remove(memoryId, userId): Promise<void>`
  - `photo(eventId: string, memoryId: string, size: 'thumb' | 'full'): Promise<Uint8Array | null>` (no auth; callers check)
  - `purgeEvent(eventId: string): Promise<void>` (deletes rows and files)
  - Organizer photo preview route `GET /v1/events/:id/memories/:mid/:size` (Bearer) so the console can show thumbnails.

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/src/memories.test.ts` (extend the imports with `eventPurchases`, `newId`, `sharp`):

```ts
import sharp from 'sharp';
import { eventPurchases } from '@harusi/db';
import { newId } from '@harusi/db';

async function photo(color = '#B8893B') {
  return new Uint8Array(
    await sharp({ create: { width: 64, height: 48, channels: 3, background: color } })
      .jpeg()
      .toBuffer(),
  );
}

async function pay(evId: string, kind: 'cards' | 'pack' | 'grant' = 'cards', status = 'paid') {
  await ctx.db.insert(eventPurchases).values({
    id: newId(),
    eventId: evId,
    kind,
    label: 'test',
    cards: kind === 'pack' ? 0 : 100,
    messages: 400,
    amount: 220_000,
    currency: 'TZS',
    status: status as 'paid',
    method: kind === 'grant' ? 'grant' : 'manual',
  });
}

function upload(t: string, evId: string, bytes: Uint8Array, fields: Record<string, string> = {}) {
  const form = new FormData();
  form.set('photo', new Blob([bytes], { type: 'image/jpeg' }), 'p.jpg');
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return ctx.app.request(`/v1/events/${evId}/memories`, {
    method: 'POST',
    headers: { authorization: `Bearer ${t}` },
    body: form,
  });
}

describe('unlocking', () => {
  it('only a paid card order unlocks; packs, grants and pending orders do not', async () => {
    const { t, evId } = await setup();
    const locked = async () =>
      (await api(ctx, 'GET', `/v1/events/${evId}/memories`, { token: t })).body!.unlocked;
    expect(await locked()).toBe(false);
    await pay(evId, 'pack');
    await pay(evId, 'grant');
    await pay(evId, 'cards', 'pending');
    expect(await locked()).toBe(false);
    const res = await upload(t, evId, await photo());
    expect(res.status).toBe(402);
    expect((await res.json()).error.details).toMatchObject({
      reason: 'feature_locked',
      feature: 'memories',
    });
    await pay(evId, 'cards');
    expect(await locked()).toBe(true);
  });
});

describe('adding and editing memories', () => {
  it('stores both sizes, returns the memory, and lists by date then order', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    const a = await upload(t, evId, await photo(), { caption: 'Tulipokutana', takenOn: '2019-03-02' });
    expect(a.status).toBe(201);
    const m = await a.json();
    expect(m).toMatchObject({ caption: 'Tulipokutana', takenOn: '2019-03-02', width: 64, height: 48 });
    expect(ctx.photos.files.has(`events/${evId}/${m.id}.webp`)).toBe(true);
    expect(ctx.photos.files.has(`events/${evId}/${m.id}.thumb.webp`)).toBe(true);
    await upload(t, evId, await photo(), { caption: 'Bila tarehe' });
    await upload(t, evId, await photo(), { caption: 'Mapema', takenOn: '2018-01-01' });
    const list = (await api(ctx, 'GET', `/v1/events/${evId}/memories`, { token: t })).body!;
    expect(list.memories.map((x: { caption: string }) => x.caption)).toEqual([
      'Mapema',
      'Tulipokutana',
      'Bila tarehe',
    ]);
    expect(list).toMatchObject({ unlocked: true, enabled: true, limit: 30, count: 3 });
  });

  it('refuses the 31st photo, and allows it after the limit is raised', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    await ctx.db.update(events).set({ memoriesLimit: 2 }).where(eq(events.id, evId));
    expect((await upload(t, evId, await photo())).status).toBe(201);
    expect((await upload(t, evId, await photo())).status).toBe(201);
    const third = await upload(t, evId, await photo());
    expect(third.status).toBe(402);
    expect((await third.json()).error.details).toMatchObject({
      reason: 'quota_exceeded',
      resource: 'memories',
      remaining: 0,
      needed: 1,
    });
    await ctx.db.update(events).set({ memoriesLimit: 3 }).where(eq(events.id, evId));
    expect((await upload(t, evId, await photo())).status).toBe(201);
  });

  it('validates caption length and date', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    expect((await upload(t, evId, await photo(), { caption: 'x'.repeat(141) })).status).toBe(400);
    expect((await upload(t, evId, await photo(), { takenOn: '2019-13-40' })).status).toBe(400);
    const bad = await upload(t, evId, new TextEncoder().encode('hello'));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.details.reason).toBe('invalid_image');
  });

  it('edits and deletes; deleting removes both files', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    const m = await (await upload(t, evId, await photo())).json();
    const edited = await api(ctx, 'PATCH', `/v1/memories/${m.id}`, {
      token: t,
      body: { caption: 'Harusi ya dada', takenOn: '2021-08-14', sortOrder: 5 },
    });
    expect(edited.body).toMatchObject({ caption: 'Harusi ya dada', takenOn: '2021-08-14', sortOrder: 5 });
    expect((await api(ctx, 'DELETE', `/v1/memories/${m.id}`, { token: t })).status).toBe(204);
    expect(ctx.photos.files.has(`events/${evId}/${m.id}.webp`)).toBe(false);
    expect(ctx.photos.files.has(`events/${evId}/${m.id}.thumb.webp`)).toBe(false);
  });

  it('committee can upload; gate gets 403; strangers get 404', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    const committee = await loginAs(ctx, `07882${String(++seq).padStart(5, '0')}`);
    const gate = await loginAs(ctx, `07882${String(++seq).padStart(5, '0')}`);
    const stranger = await loginAs(ctx, `07882${String(++seq).padStart(5, '0')}`);
    await ctx.db.insert(eventMembers).values([
      { eventId: evId, userId: committee.user.id, role: 'committee' },
      { eventId: evId, userId: gate.user.id, role: 'gate' },
    ]);
    expect((await upload(committee.accessToken, evId, await photo())).status).toBe(201);
    expect((await upload(gate.accessToken, evId, await photo())).status).toBe(403);
    expect((await upload(stranger.accessToken, evId, await photo())).status).toBe(404);
    expect(
      (await api(ctx, 'GET', `/v1/events/${evId}/memories`, { token: gate.accessToken })).status,
    ).toBe(403);
  });
});
```

Add `eventMembers` to the `@harusi/db` import. Check the `event_members` insert shape against `packages/db/src/schema.ts` (it may need an `id`); match it.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @harusi/api exec vitest run src/memories.test.ts`
Expected: FAIL with 404s (routes do not exist).

- [ ] **Step 3: Write the service**

`apps/api/src/services/memories.ts`:

```ts
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { eventPurchases, events, memories, newId } from '@harusi/db';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { processPhoto } from '../photos/process';
import { photosOf } from '../photos/store';
import { recordAudit } from './audit';
import type { EventsService } from './events';

export interface MemoryView {
  id: string;
  caption: string | null;
  takenOn: string | null;
  sortOrder: number;
  width: number;
  height: number;
}

export interface MemoriesAdminView {
  unlocked: boolean;
  enabled: boolean;
  limit: number;
  count: number;
  memories: MemoryView[];
}

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const view = (m: typeof memories.$inferSelect): MemoryView => ({
  id: m.id,
  caption: m.caption,
  takenOn: m.takenOn,
  sortOrder: m.sortOrder,
  width: m.width,
  height: m.height,
});

export function cleanCaption(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  const s = (v ?? '').trim();
  if (s.length > 140)
    throw new ApiError('validation', 'Caption is at most 140 characters', { field: 'caption' });
  return s || null;
}

export function cleanDate(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (!DATE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`)))
    throw new ApiError('validation', 'Date must look like 2019-03-02', { field: 'takenOn' });
  return v;
}

/**
 * Kumbukumbu (ADR 050): the couple's past photos for their guests. Unlocked by any paid card order;
 * owner and committee manage them; guests see them through their card token (see `forGuest`).
 */
export class MemoriesService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventsService,
  ) {}

  private get photos() {
    return photosOf(this.deps);
  }

  private async staffRole(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot manage memories');
    return role;
  }

  async unlocked(eventId: string): Promise<boolean> {
    const [row] = await this.deps.db
      .select({ n: count() })
      .from(eventPurchases)
      .where(
        and(
          eq(eventPurchases.eventId, eventId),
          eq(eventPurchases.kind, 'cards'),
          eq(eventPurchases.status, 'paid'),
        ),
      );
    return (row?.n ?? 0) > 0;
  }

  /** Date first (undated last), then the host's order. */
  async rows(eventId: string) {
    return this.deps.db
      .select()
      .from(memories)
      .where(eq(memories.eventId, eventId))
      .orderBy(
        sql`${memories.takenOn} asc nulls last`,
        asc(memories.sortOrder),
        asc(memories.createdAt),
      );
  }

  async list(eventId: string, userId: string): Promise<MemoriesAdminView> {
    await this.staffRole(eventId, userId);
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const rows = await this.rows(eventId);
    return {
      unlocked: await this.unlocked(eventId),
      enabled: event.memoriesEnabled,
      limit: event.memoriesLimit,
      count: rows.length,
      memories: rows.map(view),
    };
  }

  async add(
    eventId: string,
    userId: string,
    bytes: Uint8Array,
    input: { caption?: string | null; takenOn?: string | null },
  ): Promise<MemoryView> {
    await this.staffRole(eventId, userId);
    const caption = cleanCaption(input.caption) ?? null;
    const takenOn = cleanDate(input.takenOn) ?? null;
    if (!(await this.unlocked(eventId)))
      throw new ApiError('payment_required', 'Buy cards to unlock memories', {
        reason: 'feature_locked',
        feature: 'memories',
      });
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const [{ n } = { n: 0 }] = await this.deps.db
      .select({ n: count() })
      .from(memories)
      .where(eq(memories.eventId, eventId));
    if (n >= event.memoriesLimit)
      throw new ApiError('payment_required', 'Memories limit reached', {
        reason: 'quota_exceeded',
        resource: 'memories',
        remaining: 0,
        needed: 1,
      });
    const img = await processPhoto(bytes);
    const id = newId();
    const photoKey = `events/${eventId}/${id}.webp`;
    const thumbKey = `events/${eventId}/${id}.thumb.webp`;
    await this.photos.put(photoKey, img.full);
    await this.photos.put(thumbKey, img.thumb);
    const [row] = await this.deps.db
      .insert(memories)
      .values({
        id,
        eventId,
        photoKey,
        thumbKey,
        width: img.width,
        height: img.height,
        caption,
        takenOn,
        sortOrder: n,
        createdBy: userId,
      })
      .returning();
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'memory.create',
      entity: 'memory',
      entityId: id,
    });
    return view(row!);
  }

  private async own(memoryId: string, userId: string) {
    const [m] = await this.deps.db.select().from(memories).where(eq(memories.id, memoryId));
    if (!m) throw new ApiError('not_found', 'Memory not found');
    await this.staffRole(m.eventId, userId);
    return m;
  }

  async update(
    memoryId: string,
    userId: string,
    patch: { caption?: string | null; takenOn?: string | null; sortOrder?: number },
  ): Promise<MemoryView> {
    const m = await this.own(memoryId, userId);
    const values = {
      caption: cleanCaption(patch.caption),
      takenOn: cleanDate(patch.takenOn),
      sortOrder: patch.sortOrder,
      updatedAt: this.deps.now(),
    };
    const [row] = await this.deps.db
      .update(memories)
      .set(values)
      .where(eq(memories.id, memoryId))
      .returning();
    await recordAudit(this.deps.db, {
      eventId: m.eventId,
      actorId: userId,
      action: 'memory.update',
      entity: 'memory',
      entityId: memoryId,
    });
    return view(row!);
  }

  async remove(memoryId: string, userId: string): Promise<void> {
    const m = await this.own(memoryId, userId);
    await this.deps.db.delete(memories).where(eq(memories.id, memoryId));
    await this.photos.delete(m.photoKey);
    await this.photos.delete(m.thumbKey);
    await recordAudit(this.deps.db, {
      eventId: m.eventId,
      actorId: userId,
      action: 'memory.delete',
      entity: 'memory',
      entityId: memoryId,
    });
  }

  /** The file for a memory of this event; null when the memory is not this event's. */
  async photo(eventId: string, memoryId: string, size: 'thumb' | 'full') {
    const [m] = await this.deps.db
      .select()
      .from(memories)
      .where(and(eq(memories.id, memoryId), eq(memories.eventId, eventId)));
    if (!m) return null;
    return this.photos.get(size === 'thumb' ? m.thumbKey : m.photoKey);
  }

  /** Deletes every memory of an event, files first (event deletion, PDPA erasure). */
  async purgeEvent(eventId: string): Promise<void> {
    const rows = await this.deps.db.select().from(memories).where(eq(memories.eventId, eventId));
    for (const m of rows) {
      await this.photos.delete(m.photoKey);
      await this.photos.delete(m.thumbKey);
    }
    await this.deps.db.delete(memories).where(eq(memories.eventId, eventId));
  }
}
```

If `updatedAt` is set automatically by `timestamps` (check `packages/db/src/schema.ts:22`), drop it from `values`.

- [ ] **Step 4: Add the routes**

In `apps/api/src/app.ts`: import `MemoriesService`, and after `appReleaseSvc` add `const memoriesSvc = new MemoriesService(deps, eventsSvc);`. After the events routes:

```ts
  // ---- Kumbukumbu (ADR 050): owner and committee manage the couple's photos
  app.get('/v1/events/:id/memories', async (c) =>
    c.json(await memoriesSvc.list(c.req.param('id'), c.get('userId'))),
  );
  app.post('/v1/events/:id/memories', async (c) => {
    const form = await c.req.parseBody();
    const file = form.photo;
    if (!(file instanceof File))
      throw new ApiError('validation', 'Choose a photo', { field: 'photo' });
    const text = (k: string) => (typeof form[k] === 'string' ? (form[k] as string) : undefined);
    const m = await memoriesSvc.add(
      c.req.param('id'),
      c.get('userId'),
      new Uint8Array(await file.arrayBuffer()),
      { caption: text('caption'), takenOn: text('takenOn') },
    );
    return c.json(m, 201);
  });
  app.patch('/v1/memories/:mid', async (c) => {
    const patch = parse(
      z.object({
        caption: z.string().nullable().optional(),
        takenOn: z.string().nullable().optional(),
        sortOrder: z.number().int().min(0).max(10_000).optional(),
      }),
      await body(c),
    );
    return c.json(await memoriesSvc.update(c.req.param('mid'), c.get('userId'), patch));
  });
  app.delete('/v1/memories/:mid', async (c) => {
    await memoriesSvc.remove(c.req.param('mid'), c.get('userId'));
    return c.body(null, 204);
  });
  app.get('/v1/events/:id/memories/:mid/:size{thumb|full}', async (c) => {
    await memoriesSvc.list(c.req.param('id'), c.get('userId')); // role check
    const bytes = await memoriesSvc.photo(
      c.req.param('id'),
      c.req.param('mid'),
      c.req.param('size') as 'thumb' | 'full',
    );
    if (!bytes) throw new ApiError('not_found', 'Photo not found');
    return c.body(bytes, 200, {
      'content-type': 'image/webp',
      'cache-control': 'private, max-age=86400',
      'x-content-type-options': 'nosniff',
    });
  });
```

Check that the body-size limit middleware (search `bodyLimit` in `app.ts`) allows 8 MB on `POST /v1/events/:id/memories`; if the global limit is lower, add an exception for this path with `maxSize: 9 * 1024 * 1024`.

The image route's role check calls `list`, which also reads rows; replace it with a tiny `memoriesSvc.assertStaff(eventId, userId)` (make `staffRole` public under that name) if you prefer. Use one approach consistently.

- [ ] **Step 5: Run the tests**

Run: `pnpm --filter @harusi/api exec vitest run src/memories.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/memories.ts apps/api/src/app.ts apps/api/src/memories.test.ts
git commit -m "feat(api): Kumbukumbu memories for owner and committee, unlocked by a paid card order"
```

---

### Task 4: Guest view by card token

**Files:**
- Modify: `apps/api/src/services/cards.ts`, `apps/api/src/services/memories.ts`, `apps/api/src/app.ts`
- Test: `apps/api/src/memories.test.ts`

**Interfaces:**
- Consumes: `CardService.preview(token): Promise<CardView>` (existing).
- Produces:
  - `CardService.resolveToken(token): Promise<{ state: 'ok'; eventId: string; guestId: string } | { state: 'reissued' | 'invalid' }>`
  - `MemoriesService.forGuest(token, cards: CardService): Promise<GuestMemoriesView>` where `GuestMemoriesView = { card: CardView; memories: MemoryView[] }`. The `card` has `pledge: null`, `qrPayload: ''`.
  - `GET /v1/c/:token/memories` → `GuestMemoriesView`; reissued → `409 conflict` with `details.reason = 'reissued'`; invalid → `404 not_found`; locked, switched off or empty → `404 not_found` with `details.reason = 'memories_unavailable'`.
  - `GET /v1/c/:token/memories/:mid/:size` → WebP bytes.
  - `GET /v1/c/:token` now also returns `memoriesAvailable: boolean` (unlocked, enabled, ≥ 1 memory).

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/src/memories.test.ts`:

```ts
describe('the guest page', () => {
  async function withMemory() {
    const s = await setup();
    await pay(s.evId);
    const m = await (await upload(s.t, s.evId, await photo(), { caption: 'Tulipokutana' })).json();
    return { ...s, m };
  }

  it('shows the memories to the guest by card token, and serves the photos', async () => {
    const { g, m } = await withMemory();
    const r = await api(ctx, 'GET', `/v1/c/${g.cardToken}/memories`);
    expect(r.status).toBe(200);
    expect(r.body!.memories).toEqual([expect.objectContaining({ id: m.id, caption: 'Tulipokutana' })]);
    expect(r.body!.card.event.coupleNames).toBe('Asha & Juma');
    expect(r.body!.card.pledge).toBeNull();
    expect(JSON.stringify(r.body)).not.toContain('.webp'); // no storage keys leak
    const img = await ctx.app.request(`/v1/c/${g.cardToken}/memories/${m.id}/thumb`);
    expect(img.status).toBe(200);
    expect(img.headers.get('content-type')).toBe('image/webp');
    expect(img.headers.get('cache-control')).toBe('private, max-age=86400');
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body!.memoriesAvailable).toBe(true);
  });

  it("a guest of another event cannot fetch this event's photo", async () => {
    const { m } = await withMemory();
    const other = await setup();
    const img = await ctx.app.request(`/v1/c/${other.g.cardToken}/memories/${m.id}/full`);
    expect(img.status).toBe(404);
  });

  it('a reissued card is refused; a made-up token is not found', async () => {
    const { t, g } = await withMemory();
    expect((await api(ctx, 'POST', `/v1/guests/${g.id}/reissue`, { token: t })).status).toBe(200);
    const old = await api(ctx, 'GET', `/v1/c/${g.cardToken}/memories`);
    expect(old.status).toBe(409);
    expect(old.body!.error.details.reason).toBe('reissued');
    expect((await api(ctx, 'GET', '/v1/c/not-a-real-token-at-all/memories')).status).toBe(404);
  });

  it('is unavailable when switched off, locked, or empty', async () => {
    const { t, evId, g } = await withMemory();
    await api(ctx, 'PATCH', `/v1/events/${evId}`, { token: t, body: { memoriesEnabled: false } });
    const off = await api(ctx, 'GET', `/v1/c/${g.cardToken}/memories`);
    expect(off.status).toBe(404);
    expect(off.body!.error.details.reason).toBe('memories_unavailable');
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body!.memoriesAvailable).toBe(false);

    const locked = await setup();
    const r = await api(ctx, 'GET', `/v1/c/${locked.g.cardToken}/memories`);
    expect(r.body!.error.details.reason).toBe('memories_unavailable');
  });
});
```

Check the reissue route's success status in `app.ts` (`/v1/guests/:id/reissue`) and adjust `200` if it differs.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @harusi/api exec vitest run src/memories.test.ts -t "guest page"`
Expected: FAIL (404 on the new routes; `memoriesEnabled` ignored by PATCH).

- [ ] **Step 3: Accept `memoriesEnabled` in event PATCH**

In `apps/api/src/app.ts` `eventBase` (line ~95), after `pledgesEnabled`:

```ts
  memoriesEnabled: z.boolean().optional(),
```

In `apps/api/src/services/events.ts` `EventInput`, after `pledgesEnabled?: boolean;`:

```ts
  memoriesEnabled?: boolean;
```

`update()` already spreads the patch into `set(...)`. If `POST /v1/events` also uses `eventBase`, `create` must not fail: check that `create` ignores or stores the field.

- [ ] **Step 4: Add `resolveToken` to CardService**

In `apps/api/src/services/cards.ts`, after `preview`:

```ts
  /** Which guest a token belongs to, or why it does not (used by Kumbukumbu, ADR 050). */
  async resolveToken(
    token: string,
  ): Promise<
    { state: 'ok'; eventId: string; guestId: string } | { state: 'reissued' | 'invalid' }
  > {
    const { hash, row } = await this.find(token);
    if (row) return { state: 'ok', eventId: row.event.id, guestId: row.guest.id };
    const [retired] = await this.deps.db
      .select({ id: retiredCardTokens.id })
      .from(retiredCardTokens)
      .where(eq(retiredCardTokens.tokenHash, hash));
    return { state: retired ? 'reissued' : 'invalid' };
  }
```

- [ ] **Step 5: Add `forGuest` and `availableFor` to MemoriesService**

```ts
  /** Unlocked, switched on, and at least one photo. */
  async availableFor(eventId: string): Promise<boolean> {
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event?.memoriesEnabled) return false;
    if (!(await this.unlocked(eventId))) return false;
    const [{ n } = { n: 0 }] = await this.deps.db
      .select({ n: count() })
      .from(memories)
      .where(eq(memories.eventId, eventId));
    return n > 0;
  }

  /** The guest's page. Never says why it is unavailable: a guest is not told about payments. */
  async guestEvent(token: string, cards: CardService): Promise<string> {
    const r = await cards.resolveToken(token);
    if (r.state === 'reissued')
      throw new ApiError('conflict', 'This card was replaced', { reason: 'reissued' });
    if (r.state === 'invalid') throw new ApiError('not_found', 'Invalid link');
    if (!(await this.availableFor(r.eventId)))
      throw new ApiError('not_found', 'Memories are not available', {
        reason: 'memories_unavailable',
      });
    return r.eventId;
  }

  async forGuest(token: string, cards: CardService) {
    const eventId = await this.guestEvent(token, cards);
    const card = await cards.preview(token);
    return {
      card: { ...card, pledge: null, qrPayload: '' },
      memories: (await this.rows(eventId)).map(view),
    };
  }
```

Import `type CardService` from `./cards`.

- [ ] **Step 6: Add the guest routes and `memoriesAvailable`**

In `apps/api/src/app.ts`, after the `/v1/c/:token/preview` route:

```ts
  app.get('/v1/c/:token/memories', async (c) => {
    await cardReads.check(`ip:${client(c)}`);
    await cardReads.check(`t:${c.req.param('token').slice(0, 8)}`);
    return c.json(await memoriesSvc.forGuest(c.req.param('token'), cardsSvc));
  });
  app.get('/v1/c/:token/memories/:mid/:size{thumb|full}', async (c) => {
    await cardReads.check(`ip:${client(c)}`);
    const eventId = await memoriesSvc.guestEvent(c.req.param('token'), cardsSvc);
    const bytes = await memoriesSvc.photo(
      eventId,
      c.req.param('mid'),
      c.req.param('size') as 'thumb' | 'full',
    );
    if (!bytes) throw new ApiError('not_found', 'Photo not found');
    return c.body(bytes, 200, {
      'content-type': 'image/webp',
      'cache-control': 'private, max-age=86400',
      'x-content-type-options': 'nosniff',
    });
  });
```

Photo requests only use the per-IP limit: a page of 30 thumbnails would otherwise use up the per-token budget. Check that `cardReadLimit` (config) is ≥ 60 per minute; if not, give photos their own limiter: `new RateLimiter(deps.now, 240, 60_000, 'memory-photo', deps.rateStore)`.

Make `GET /v1/c/:token` include the flag:

```ts
  app.get('/v1/c/:token', async (c) => {
    await cardReads.check(`ip:${client(c)}`);
    await cardReads.check(`t:${c.req.param('token').slice(0, 8)}`);
    const v = await cardsSvc.get(c.req.param('token'));
    const memoriesAvailable = v.event ? await memoriesSvc.availableFor(v.event.id) : false;
    return c.json({ ...v, memoriesAvailable });
  });
```

- [ ] **Step 7: Run all API tests that touch cards**

Run: `pnpm --filter @harusi/api exec vitest run src/memories.test.ts src/card.test.ts`
Expected: PASS. If a `card.test.ts` snapshot or strict `toEqual` fails because of the new `memoriesAvailable` key, add the key to that expectation.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/services/cards.ts apps/api/src/services/memories.ts apps/api/src/services/events.ts apps/api/src/app.ts apps/api/src/memories.test.ts apps/api/src/card.test.ts
git commit -m "feat(api): guests see Kumbukumbu by their card token"
```

---

### Task 5: Deleting events, erasing accounts, and the staff limit

**Files:**
- Modify: `apps/api/src/services/events.ts` (`remove`), `apps/api/src/services/ops.ts` (`deleteAccount`), `apps/api/src/app.ts`
- Test: `apps/api/src/memories.test.ts`

**Interfaces:**
- Consumes: `MemoriesService.purgeEvent(eventId)`.
- Produces: `PATCH /v1/ops/events/:id/memories-limit` body `{ limit: number (1–200), note: string (≥ 3 chars) }` → `{ limit }`, staff permission `plan`, audit action `ops.memories_limit`.

- [ ] **Step 1: Write the failing tests**

```ts
describe('deletion and the staff limit', () => {
  it('deleting the event removes its memories and files', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    const m = await (await upload(t, evId, await photo())).json();
    expect((await api(ctx, 'DELETE', `/v1/events/${evId}`, { token: t })).status).toBe(204);
    expect(await ctx.db.select().from(memories).where(eq(memories.eventId, evId))).toEqual([]);
    expect(ctx.photos.files.has(`events/${evId}/${m.id}.webp`)).toBe(false);
  });

  it('staff with the plan permission change the limit, with a reason', async () => {
    const { evId } = await setup();
    const billing = await loginAsStaff(ctx, '0746100001', 'billing');
    const noReason = await api(ctx, 'PATCH', `/v1/ops/events/${evId}/memories-limit`, {
      token: billing.accessToken,
      body: { limit: 60, note: '' },
    });
    expect(noReason.status).toBe(400);
    const ok = await api(ctx, 'PATCH', `/v1/ops/events/${evId}/memories-limit`, {
      token: billing.accessToken,
      body: { limit: 60, note: 'Mteja aliomba' },
    });
    expect(ok.body).toEqual({ limit: 60 });
    const support = await loginAsStaff(ctx, '0746100002', 'support');
    expect(
      (
        await api(ctx, 'PATCH', `/v1/ops/events/${evId}/memories-limit`, {
          token: support.accessToken,
          body: { limit: 90, note: 'jaribio' },
        })
      ).status,
    ).toBe(403);
  });
});
```

Add `loginAsStaff` to the test-app import. Check `staff-guard.ts` to confirm `billing` has `plan` and `support` does not; adjust the roles in the test to match.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @harusi/api exec vitest run src/memories.test.ts -t "deletion"`
Expected: FAIL.

- [ ] **Step 3: Purge on event delete**

`EventsService` is constructed before `MemoriesService`, so purge inline instead of creating a cycle. At the end of `EventsService.remove`, before `recordAudit`:

```ts
    // Kumbukumbu photos are not needed for billing or PDPA records: delete them now (ADR 050).
    await new MemoriesService(this.deps, this).purgeEvent(eventId);
```

(import `MemoriesService` from `./memories`; `memories.ts` only imports `EventsService` as a type, so there is no runtime cycle).

- [ ] **Step 4: Purge on account erasure**

In `apps/api/src/services/ops.ts` `deleteAccount(tx, userId)`, read how it treats the user's owned events. For every event where `events.owner_id = userId`, call `await new MemoriesService(this.deps, new EventsService(this.deps)).purgeEvent(e.id)` **after** the transaction commits (file deletes cannot be rolled back). If `deleteAccount` runs inside `tx`, collect the event ids inside the transaction and purge after `fileRequest`'s transaction returns. Add a test: owner files a deletion, staff complete it, the memory files are gone. Copy the request/complete calls from the existing PDPA test in `apps/api/src/ops.test.ts` (search for `'deletion'`).

- [ ] **Step 5: Add the staff route**

In `MemoriesService`:

```ts
  async opsSetLimit(caller: StaffCaller, eventId: string, limit: number, note: string) {
    const staff = await requireStaff(this.deps.db, caller, 'plan');
    const why = note.trim();
    if (why.length < 3) throw new ApiError('validation', 'reason_required', { field: 'note' });
    const [row] = await this.deps.db
      .update(events)
      .set({ memoriesLimit: limit })
      .where(eq(events.id, eventId))
      .returning({ limit: events.memoriesLimit });
    if (!row) throw new ApiError('not_found', 'Event not found');
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: staff.id,
      action: 'ops.memories_limit',
      entity: 'event',
      entityId: eventId,
      diff: { limit, note: why },
    });
    return { limit: row.limit };
  }
```

(import `requireStaff, type StaffCaller` from `./staff-guard`). Route in `app.ts` next to the other `/v1/ops/events/:id` routes:

```ts
  app.patch('/v1/ops/events/:id/memories-limit', async (c) => {
    const input = parse(
      z.object({ limit: z.number().int().min(1).max(200), note: z.string() }),
      await body(c),
    );
    return c.json(await memoriesSvc.opsSetLimit(staff(c), idParam(c), input.limit, input.note));
  });
```

Show and edit the limit on the staff event page: in `apps/web/app/ops/…` find the event detail that renders `opsEventBilling` (search `opsEventBilling` / `ops/billing` in `apps/web`), add a "Kumbukumbu: {count} / {limit}" line and a small form calling a new repository method `opsSetMemoriesLimit(eventId, limit, note)` (add it in Task 7).

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter @harusi/api exec vitest run src/memories.test.ts src/ops.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): delete memory photos with the event or account; staff set the limit"
```

---

### Task 6: Sending the link (WhatsApp and SMS) and the share link

**Files:**
- Modify: `packages/messaging/src/index.ts` (`MessageTemplate.kind`), `packages/messaging/src/whatsapp-cloud.ts` (`TemplateNames`), `apps/api/src/config.ts` (template env), `apps/api/src/services/messages.ts` (`composeSms`), `apps/api/src/services/delivery.ts`, `apps/api/src/app.ts`, `.env.example`
- Test: `apps/api/src/memories.test.ts`

**Interfaces:**
- Produces:
  - `DeliveryService.sendMemories(eventId, userId, guestIds: string[] | 'all'): Promise<{ sent: number; failed: number; skipped: number }>`
  - `DeliveryService.memoriesLink(guestId, userId): Promise<{ url: string; waUrl: string | null }>`
  - `POST /v1/events/:id/memories/send` body `{ guestIds?: string[] }` (absent = all guests with a phone)
  - `GET /v1/guests/:gid/memories-link`
  - Template kind `'memories'`; params `[hosts, link]`; env `WHATSAPP_TEMPLATE_MEMORIES`, `WHATSAPP_TEMPLATE_MEMORIES_KE`
  - Short link format `<short base>/s/<token>/k`

- [ ] **Step 1: Write the failing tests**

```ts
describe('sending the memories link', () => {
  async function ready() {
    const s = await setup();
    await pay(s.evId);
    await upload(s.t, s.evId, await photo());
    return s;
  }

  it('sends each guest their own link and spends one credit per delivered message', async () => {
    const { t, evId, g } = await ready();
    const before = ctx.whatsapp.sent.length + ctx.sms.sent.length;
    const r = await api(ctx, 'POST', `/v1/events/${evId}/memories/send`, { token: t, body: {} });
    expect(r.body).toMatchObject({ sent: 1, failed: 0 });
    const msgs = [...ctx.whatsapp.sent, ...ctx.sms.sent].slice(before);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]!.body).toContain(`/s/${g.cardToken}/k`);
    const logged = await ctx.db
      .select()
      .from(messageLog)
      .where(and(eq(messageLog.guestId, g.id), eq(messageLog.kind, 'memories')));
    expect(logged).toHaveLength(1);
  });

  it('a failed message is not charged and falls back from WhatsApp to SMS', async () => {
    const { t, evId } = await ready();
    ctx.fail.wa = () => true;
    try {
      const r = await api(ctx, 'POST', `/v1/events/${evId}/memories/send`, { token: t, body: {} });
      expect(r.body).toMatchObject({ sent: 1 });
    } finally {
      ctx.fail.wa = () => false;
    }
  });

  it('refuses a locked event and an empty page', async () => {
    const locked = await setup();
    const a = await api(ctx, 'POST', `/v1/events/${locked.evId}/memories/send`, {
      token: locked.t,
      body: {},
    });
    expect(a.status).toBe(402);
    const empty = await setup();
    await pay(empty.evId);
    const b = await api(ctx, 'POST', `/v1/events/${empty.evId}/memories/send`, {
      token: empty.t,
      body: {},
    });
    expect(b.status).toBe(400);
    expect(b.body!.error.details.reason).toBe('no_memories');
  });

  it('gives the host a wa.me link with the guest’s own memories link', async () => {
    const { t, g } = await ready();
    const r = await api(ctx, 'GET', `/v1/guests/${g.id}/memories-link`, { token: t });
    expect(r.body!.url).toMatch(new RegExp(`/c/${g.cardToken}/kumbukumbu$`));
    expect(r.body!.waUrl).toMatch(/^https:\/\/wa\.me\/2557\d{8}\?text=/);
    expect(decodeURIComponent(r.body!.waUrl.split('text=')[1])).toContain(r.body!.url);
  });
});
```

Add `messageLog` and `and` to the imports. Whether the first message goes by WhatsApp or SMS depends on the guest's channel preference; the test only counts messages. Check how `dispatch` picks channels for this guest and adjust the fallback test if WhatsApp is not tried first for a guest whose `channelLast` is null. Copy the pattern `sendPledgeReminders` uses (`channelLast === 'whatsapp' && whatsapp ? ['whatsapp','sms'] : ['sms']`) or, better, the `channelsFor(guest, 'auto')` used by invites, so new guests get WhatsApp first.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @harusi/api exec vitest run src/memories.test.ts -t "sending"`
Expected: FAIL (404).

- [ ] **Step 3: Template kind and names**

`packages/messaging/src/index.ts`:

```ts
  kind: 'invite' | 'reminder' | 'pledge' | 'contribution' | 'memories';
```

and add to the params doc: `memories (both countries): hosts, link.`

`packages/messaging/src/whatsapp-cloud.ts` `TemplateNames`: add `memories?: string;`.

`apps/api/src/config.ts`: add `memories?: string` to the templates type (line 55) and `memories: env.WHATSAPP_TEMPLATE_MEMORIES,` beside `contribution` (line ~190); for Kenya add `memories: env.WHATSAPP_TEMPLATE_MEMORIES_KE` and include it in the "any KE template set" check. Check `messaging-settings.ts` for a template list edited in /ops and add `memories` there too if templates are listed.

`.env.example`: `WHATSAPP_TEMPLATE_MEMORIES=` and `WHATSAPP_TEMPLATE_MEMORIES_KE=`.

- [ ] **Step 4: SMS wording**

In `apps/api/src/services/messages.ts` `composeSms`, widen the type to `'invite' | 'reminder' | 'contribution' | 'pledge' | 'memories'`. The `key` record needs a `TemplateKey` for each type: add `memoriesSms` to `TemplateKey` (find its definition; it is the key set of `cardContent.messages`) **or** short-circuit before the record, because hosts cannot customise this message in v1:

```ts
  if (type === 'memories') {
    const v = messageVars(i);
    return i.guest.language === 'sw'
      ? `${v.hosts} wameshiriki kumbukumbu zao nawe: ${i.link}`
      : `${v.hosts} shared their memories with you: ${i.link}`;
  }
```

Put this as the first statement of `composeSms` and keep the `key` record typed on the other four types (`Exclude<typeof type, 'memories'>`). Check that `messageVars` returns `hosts`; if it does not, build it with `hostNames(a, b)` as `sendPledgeReminders` does. Keep the result ≤ 160 characters for two short names and a short link; add a unit test in `apps/api/src/memories.test.ts` that composes it for `Asha & Juma` with a 40-character link and asserts `length <= 160`.

- [ ] **Step 5: `sendMemories` and `memoriesLink`**

In `apps/api/src/services/delivery.ts`, after `sendPledgeReminders`:

```ts
  /**
   * Kumbukumbu (ADR 050): each guest gets their own memories link. Spends one reminder credit per
   * message that is not a failure (ADR 042), refused up front when credits are short.
   */
  async sendMemories(eventId: string, userId: string, guestIds: string[] | 'all') {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot send messages');
    const memoriesSvc = new MemoriesService(this.deps, this.eventsSvc);
    if (!(await memoriesSvc.unlocked(eventId)))
      throw new ApiError('payment_required', 'Buy cards to unlock memories', {
        reason: 'feature_locked',
        feature: 'memories',
      });
    if (!(await memoriesSvc.availableFor(eventId)))
      throw new ApiError('validation', 'Add photos and switch the page on first', {
        reason: 'no_memories',
      });
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    const rows = await this.deps.db
      .select({ guest: guests, inv: invitations })
      .from(guests)
      .innerJoin(invitations, eq(invitations.guestId, guests.id))
      .where(
        and(
          eq(guests.eventId, eventId),
          isNull(guests.deletedAt),
          isNotNull(guests.phoneE164),
          ...(guestIds === 'all' ? [] : [inArray(guests.id, guestIds)]),
        ),
      );
    await this.billing.assertCanUse(eventId, { messages: rows.length });
    const budget = await this.billing.budget(eventId);
    const [a = '', b = ''] = event.coupleNames.split('&').map((x) => x.trim());
    const hosts = hostNames(a, b);
    const out = { sent: 0, failed: 0, skipped: 0 };
    for (const { guest, inv } of rows) {
      const channels = this.channelsFor(guest, 'auto');
      if (channels.length === 0) {
        out.skipped++;
        continue;
      }
      const link = `${shortBaseFor(this.deps.config, event.country)}/s/${await this.cardToken(inv)}/k`;
      const text = composeSms('memories', { event, guest, link });
      const r = await this.dispatch(
        guest,
        inv,
        event,
        'memories',
        channels,
        undefined,
        {
          text,
          template: {
            kind: 'memories',
            locale: guest.language,
            country: event.country,
            params: [hosts, link],
          },
        },
        budget,
      );
      out[r.ok ? 'sent' : 'failed']++;
    }
    return out;
  }

  /** The guest's own memories link and a wa.me link the host opens on their phone (free). */
  async memoriesLink(guestId: string, userId: string) {
    const [row] = await this.deps.db
      .select({ guest: guests, inv: invitations, event: events })
      .from(guests)
      .innerJoin(events, eq(events.id, guests.eventId))
      .leftJoin(invitations, eq(invitations.guestId, guests.id))
      .where(and(eq(guests.id, guestId), isNull(guests.deletedAt)));
    if (!row) throw new ApiError('not_found', 'Guest not found');
    const role = await this.eventsSvc.role(row.event.id, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot share links');
    if (!row.inv)
      throw new ApiError('conflict', 'This guest has no card yet', { reason: 'no_invitation' });
    const url = `${this.deps.config.appBaseUrl}/c/${await this.cardToken(row.inv)}/kumbukumbu`;
    const text = composeSms('memories', { event: row.event, guest: row.guest, link: url });
    const waUrl = row.guest.phoneE164
      ? `https://wa.me/${row.guest.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
      : null;
    return { url, waUrl };
  }
```

Imports to add: `MemoriesService` from `./memories`, `isNotNull` from `drizzle-orm`, and `hostNames` (find where `sendPledgeReminders` gets it). Use the card domain that delivery already uses for `/c/` links if there is a per-country one (search `appBaseUrl` in `delivery.ts`); use the same helper here. Check `MessageInput` (what `composeSms` takes) for required fields and pass the same ones `sendPledgeReminders` passes.

- [ ] **Step 6: Routes**

```ts
  app.post('/v1/events/:id/memories/send', async (c) => {
    const input = parse(
      z.object({ guestIds: z.array(z.string().uuid()).max(5000).optional() }),
      await body(c),
    );
    return c.json(
      await deliverySvc.sendMemories(c.req.param('id'), c.get('userId'), input.guestIds ?? 'all'),
    );
  });
  app.get('/v1/guests/:gid/memories-link', async (c) =>
    c.json(await deliverySvc.memoriesLink(c.req.param('gid'), c.get('userId'))),
  );
```

Make sure the request logger does not log this response body (it logs route patterns only; check `observability.ts`).

- [ ] **Step 7: Run all API tests**

Run: `pnpm --filter @harusi/api test` and `pnpm --filter @harusi/messaging test`
Expected: PASS. Then `pnpm --filter @harusi/api typecheck`.

- [ ] **Step 8: Commit**

```bash
git add packages/messaging/src apps/api/src .env.example
git commit -m "feat(api): send each guest their Kumbukumbu link by WhatsApp or SMS"
```

---

### Task 7: API client (types, HTTP, mock)

**Files:**
- Modify: `packages/api-client/src/types.ts`, `repository.ts`, `http-repository.ts`, `mock/mock-repository.ts`, `mock/state.ts`
- Test: `packages/api-client/src/mock/mock-repository.test.ts`

**Interfaces:**
- Produces (on `Repository`):

```ts
  // Kumbukumbu (ADR 050)
  listMemories(eventId: string): Promise<MemoriesAdminView>;
  addMemory(eventId: string, photo: Blob, input: { caption?: string; takenOn?: string }): Promise<Memory>;
  updateMemory(memoryId: string, patch: { caption?: string | null; takenOn?: string | null; sortOrder?: number }): Promise<Memory>;
  deleteMemory(memoryId: string): Promise<void>;
  /** URL of a photo for the console (Bearer auth needed: fetch it and use an object URL). */
  memoryPhotoPath(eventId: string, memoryId: string, size: 'thumb' | 'full'): string;
  fetchMemoryPhoto(eventId: string, memoryId: string, size: 'thumb' | 'full'): Promise<Blob>;
  sendMemories(eventId: string, guestIds?: string[]): Promise<{ sent: number; failed: number; skipped: number }>;
  getMemoriesLink(guestId: string): Promise<{ url: string; waUrl: string | null }>;
  getGuestMemories(token: string): Promise<GuestMemoriesView>;
  opsSetMemoriesLimit(eventId: string, limit: number, note: string): Promise<{ limit: number }>;
```

- Types in `types.ts`:

```ts
export interface Memory {
  id: string;
  caption: string | null;
  takenOn: string | null;
  sortOrder: number;
  width: number;
  height: number;
}
export interface MemoriesAdminView {
  unlocked: boolean;
  enabled: boolean;
  limit: number;
  count: number;
  memories: Memory[];
}
export interface GuestMemoriesView {
  card: CardView;
  memories: Memory[];
}
```

  and add `memoriesAvailable: boolean` to `CardView` and `memoriesEnabled: boolean` to the event type used by the console (`WeddingEvent`; map it in the HTTP event mapper with `?? true`).

- [ ] **Step 1: Write the failing mock test**

In `packages/api-client/src/mock/mock-repository.test.ts`, following the file's existing setup (read its first 40 lines for how it creates a repository and an event):

```ts
describe('memories (mock)', () => {
  it('adds, lists by date, edits and deletes', async () => {
    const ev = (await repo.listEvents())[0]!.id;
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    await repo.addMemory(ev, png, { caption: 'B', takenOn: '2020-01-01' });
    const a = await repo.addMemory(ev, png, { caption: 'A', takenOn: '2019-01-01' });
    let v = await repo.listMemories(ev);
    expect(v.memories.map((m) => m.caption)).toEqual(['A', 'B']);
    await repo.updateMemory(a.id, { caption: 'A2' });
    await repo.deleteMemory(a.id);
    v = await repo.listMemories(ev);
    expect(v.memories.map((m) => m.caption)).toEqual(['B']);
  });
});
```

`repo` is the `MockRepository` the file's `beforeEach` builds. If the first seeded event is not marked paid, mark it the way the mock's billing tests do before `addMemory`, and add a second test that an unpaid event gets `payment_required`.

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @harusi/api-client test`
Expected: FAIL, `addMemory` is not a function.

- [ ] **Step 3: Add types and interface methods** (as listed above).

- [ ] **Step 4: HTTP implementation** in `http-repository.ts`, using its `call` and `raw` helpers:

```ts
    listMemories: (eventId) => call('GET', `/v1/events/${encodeURIComponent(eventId)}/memories`),
    async addMemory(eventId, photo, input) {
      const form = new FormData();
      form.set('photo', photo, 'photo');
      if (input.caption) form.set('caption', input.caption);
      if (input.takenOn) form.set('takenOn', input.takenOn);
      return callForm('POST', `/v1/events/${encodeURIComponent(eventId)}/memories`, form);
    },
    updateMemory: (id, patch) => call('PATCH', `/v1/memories/${encodeURIComponent(id)}`, patch),
    async deleteMemory(id) {
      await call('DELETE', `/v1/memories/${encodeURIComponent(id)}`);
    },
    memoryPhotoPath: (eventId, id, size) =>
      `/v1/events/${encodeURIComponent(eventId)}/memories/${encodeURIComponent(id)}/${size}`,
    async fetchMemoryPhoto(eventId, id, size) {
      return callBlob('GET', `/v1/events/${encodeURIComponent(eventId)}/memories/${encodeURIComponent(id)}/${size}`);
    },
    sendMemories: (eventId, guestIds) =>
      call('POST', `/v1/events/${encodeURIComponent(eventId)}/memories/send`, { guestIds }),
    getMemoriesLink: (guestId) =>
      call('GET', `/v1/guests/${encodeURIComponent(guestId)}/memories-link`),
    async getGuestMemories(token) {
      const r = await raw('GET', `/v1/c/${encodeURIComponent(token)}/memories`, undefined, {}, false);
      if (r.status >= 400) return fail(r.status, r.json as never);
      const j = r.json as unknown as { card: ApiCard; memories: Memory[] };
      return { card: mapCard(token, j.card), memories: j.memories };
    },
    opsSetMemoriesLimit: (eventId, limit, note) =>
      call('PATCH', `/v1/ops/events/${encodeURIComponent(eventId)}/memories-limit`, { limit, note }),
```

`callForm` and `callBlob`: check whether the file already has helpers for multipart and binary responses (`exportCsv` returns a Blob; the ops APK upload sends bytes). Reuse those; if there is no multipart helper, write `callForm` next to `call` the same way, but without setting `content-type` (the browser sets the boundary) and with the same auth/refresh handling. In `mapCard`, add `memoriesAvailable: c.memoriesAvailable ?? false` and add the field to `ApiCard`.

`fail()` must map a 409 with `details.reason === 'reissued'` to the `reissued` repository error code, as it does for the card RSVP; check and reuse.

- [ ] **Step 5: Mock implementation** in `mock/mock-repository.ts` + `mock/state.ts`: keep `memories: Record<eventId, Memory[]>` and `memoryBlobs: Record<memoryId, Blob>` in state; `addMemory` refuses with `RepositoryError('payment_required', …)` when the event's mock plan is not paid (follow how the mock models billing), enforces 30, validates caption length; `listMemories` sorts like the server (date asc, undated last, then `sortOrder`); `fetchMemoryPhoto` returns the stored blob; `getGuestMemories(token)` uses the mock's card lookup and returns `{ card, memories }`, throwing `not_found` when there are none; `sendMemories` returns `{ sent: n, failed: 0, skipped: 0 }` for guests with phones; `getMemoriesLink` returns `{ url: '/c/<token>/kumbukumbu', waUrl }`; `opsSetMemoriesLimit` stores the limit.

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm --filter @harusi/api-client test && pnpm -r typecheck`
Expected: PASS. Typecheck fails wherever another `Repository` implementation exists; add the methods there too.

- [ ] **Step 7: Commit**

```bash
git add packages/api-client
git commit -m "feat(api-client): Kumbukumbu methods for console, app and guest page"
```

---

### Task 8: Strings

**Files:**
- Modify: `packages/i18n/src/sw.json`, `packages/i18n/src/en.json` (and the matching `packages/i18n/fragments/*.json` if `merge.py` builds the src files from fragments: read `packages/i18n/merge.py` first and edit the fragments, then run it)
- Test: `packages/i18n/src/index.test.ts` (existing key-parity test)

- [ ] **Step 1: Add the keys**

Under `nav`: `"memories": "Kumbukumbu"` / `"memories": "Memories"`.

New top-level `memories` block (sw first, en second):

```json
"memories": {
  "title": "Kumbukumbu",
  "lockedTitle": "Kumbukumbu zinapatikana baada ya kununua kadi",
  "lockedBody": "Shiriki picha za safari yenu na wageni wenu. Nunua kadi ili kufungua ukurasa huu.",
  "lockedCta": "Nunua kadi",
  "count": "{count} / {limit}",
  "add": "Ongeza picha",
  "caption": "Maelezo (si lazima)",
  "takenOn": "Tarehe (si lazima)",
  "save": "Hifadhi",
  "edit": "Badilisha",
  "delete": "Futa picha",
  "deleteConfirm": "Futa picha \"{caption}\"? Wageni hawataiona tena.",
  "deleteConfirmNoCaption": "Futa picha hii? Wageni hawataiona tena.",
  "moveUp": "Peleka juu",
  "moveDown": "Shusha chini",
  "empty": "Hakuna kumbukumbu bado",
  "emptyCta": "Ongeza picha ya kwanza",
  "enabled": "Wageni wanaweza kuona ukurasa huu",
  "preview": "Angalia kama mgeni",
  "full": "Umefikia kikomo cha picha {limit}",
  "uploading": "Inapakia…",
  "uploadFailed": "Imeshindikana kupakia",
  "invalidImage": "Faili hii si picha tunayoweza kutumia (JPEG, PNG au WebP).",
  "tooLarge": "Picha isizidi MB 8.",
  "share": "Shiriki WhatsApp",
  "sendTitle": "Tuma kumbukumbu",
  "sendBody": "Kila mgeni atapokea kiungo chake. Kila ujumbe unatumia salio 1 la ujumbe.",
  "guestPageTitle": "Kumbukumbu za {hosts}",
  "backToCard": "Rudi kwenye kadi",
  "unavailableTitle": "Ukurasa huu haupatikani kwa sasa",
  "unavailableBody": "Wasiliana na kamati kama unahitaji msaada.",
  "openCardMemories": "Kumbukumbu",
  "photoAlt": "Picha: {caption}",
  "photoAltNoCaption": "Picha ya kumbukumbu",
  "close": "Funga"
}
```

English:

```json
"memories": {
  "title": "Memories",
  "lockedTitle": "Memories open once you buy cards",
  "lockedBody": "Share photos of your journey with your guests. Buy cards to unlock this page.",
  "lockedCta": "Buy cards",
  "count": "{count} / {limit}",
  "add": "Add photo",
  "caption": "Caption (optional)",
  "takenOn": "Date (optional)",
  "save": "Save",
  "edit": "Edit",
  "delete": "Delete photo",
  "deleteConfirm": "Delete the photo \"{caption}\"? Guests will no longer see it.",
  "deleteConfirmNoCaption": "Delete this photo? Guests will no longer see it.",
  "moveUp": "Move up",
  "moveDown": "Move down",
  "empty": "No memories yet",
  "emptyCta": "Add the first photo",
  "enabled": "Guests can see this page",
  "preview": "View as a guest",
  "full": "You have reached the limit of {limit} photos",
  "uploading": "Uploading…",
  "uploadFailed": "Upload failed",
  "invalidImage": "This file is not a photo we can use (JPEG, PNG or WebP).",
  "tooLarge": "Photos can be at most 8 MB.",
  "share": "Share on WhatsApp",
  "sendTitle": "Send memories",
  "sendBody": "Each guest gets their own link. Each message uses 1 message credit.",
  "guestPageTitle": "{hosts}'s memories",
  "backToCard": "Back to the card",
  "unavailableTitle": "This page is not available right now",
  "unavailableBody": "Contact the committee if you need help.",
  "openCardMemories": "Memories",
  "photoAlt": "Photo: {caption}",
  "photoAltNoCaption": "Memory photo",
  "close": "Close"
}
```

Mark the Swahili block for native-speaker review in `docs/ux/` like the other new strings (check how earlier ADRs flagged strings).

- [ ] **Step 2: Run the i18n tests**

Run: `pnpm --filter @harusi/i18n test`
Expected: PASS (same keys in both languages).

- [ ] **Step 3: Commit**

```bash
git add packages/i18n
git commit -m "feat(i18n): Kumbukumbu strings in Swahili and English"
```

---

### Task 9: Guest page and short link (web)

**Files:**
- Modify: `apps/web/src/lib/light-card/render.ts` (export `shell`, `esc`, `langChip`, `brandLogo`, `icon`, `type Msg`; add the card's Kumbukumbu button)
- Create: `apps/web/src/lib/light-card/memories.ts`, `apps/web/src/lib/light-card/memories.test.ts`
- Create: `apps/web/app/c/[token]/kumbukumbu/route.ts`, `apps/web/app/s/[code]/k/page.tsx`
- Modify: `apps/web/src/lib/server-mock.ts` (`peekGuestMemoriesOnServer`), the card service worker (search `apps/web/public` for the card SW) to cache `/c/*/kumbukumbu` and thumbnails, `apps/web/app/dev/states` (add the three states)

**Interfaces:**
- Consumes: `GuestMemoriesView`, `CardView.memoriesAvailable` (Task 7); strings (Task 8).
- Produces: `renderMemories(view: GuestMemoriesView, o: LightCardOptions): string`; `renderMemoriesUnavailable(o): string`.

- [ ] **Step 1: Write the failing render tests**

`apps/web/src/lib/light-card/memories.test.ts` (copy the CardView fixture builder from `render.test.ts`; import it if it is exported):

```ts
import { describe, expect, it } from 'vitest';
import { renderMemories, renderMemoriesUnavailable } from './memories';
import { sampleCard } from './render.test'; // or the fixture used there

const base = { token: 'tok123', locale: 'sw' as const, domain: 'kadisasa.com', mode: 'api' as const, apiUrl: 'https://api.example' };

describe('renderMemories', () => {
  const view = {
    card: sampleCard(),
    memories: [
      { id: 'm1', caption: 'Tulipokutana <b>', takenOn: '2019-03-02', sortOrder: 0, width: 1280, height: 853 },
      { id: 'm2', caption: null, takenOn: null, sortOrder: 1, width: 853, height: 1280 },
    ],
  };

  it('lists photos with escaped captions, sizes, lazy loading and token-scoped URLs', () => {
    const html = renderMemories(view, base);
    expect(html).toContain('noindex,nofollow');
    expect(html).toContain('Tulipokutana &lt;b&gt;');
    expect(html).toContain('src="https://api.example/v1/c/tok123/memories/m1/thumb"');
    expect(html).toContain('width="1280" height="853"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('href="/c/tok123"');
    expect(html).toContain('data-testid="memories-list"');
  });

  it('shows the trust strip', () => {
    expect(renderMemories(view, base)).toContain('data-testid="trust-strip"');
  });

  it('renders the unavailable state', () => {
    expect(renderMemoriesUnavailable(base)).toContain('data-testid="memories-unavailable"');
  });
});
```

If the card's trust strip uses a different test id, use that id here and in the renderer.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @harusi/web exec vitest run src/lib/light-card/memories.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Export the helpers** from `render.ts` (`export const esc`, `export function shell`, `export function langChip`, `export function brandLogo`, `export const icon`, `export type Msg`). Pull the card's trust strip into an exported `trustStrip(view: CardView, locale: Locale, domain: string): string` and use it in `renderCard` (no visual change).

- [ ] **Step 4: Write the renderer**

`apps/web/src/lib/light-card/memories.ts`:

```ts
import { messages, type Locale } from '@harusi/i18n';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import type { GuestMemoriesView } from '@harusi/api-client';
import { formatIcu } from '../icu';
import {
  brandLogo,
  esc,
  langChip,
  shell,
  trustStrip,
  type LightCardOptions,
  type Msg,
} from './render';

const CSS = `
.mem{max-width:560px;margin:0 auto;padding:16px}
.mem h1{font-family:var(--display,serif);font-size:28px;margin:8px 0 16px;color:var(--ink)}
.mem ol{list-style:none;margin:0;padding:0;display:grid;gap:24px}
.mem figure{margin:0}
.mem img{width:100%;height:auto;border-radius:12px;background:var(--border);display:block}
.mem time{display:block;font-size:14px;color:var(--muted);margin:0 0 8px}
.mem figcaption{font-size:16px;margin-top:8px;color:var(--ink)}
.mem dialog{padding:0;border:0;max-width:100vw;max-height:100vh;background:#000}
.mem dialog img{max-height:90vh;width:auto;max-width:100vw;border-radius:0}
.mem dialog button{position:absolute;top:8px;right:8px;min-height:48px;min-width:48px}
.mem .back{display:inline-flex;min-height:48px;align-items:center;color:var(--hp-primary)}
`;

function dateText(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'sw' ? 'sw-TZ' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`));
}

/** Kumbukumbu (ADR 050): plain HTML like the card (ADR 014); a few lines of script for the viewer. */
export function renderMemories(view: GuestMemoriesView, o: LightCardOptions): string {
  const m = messages[o.locale] as unknown as { memories: Msg };
  const t = m.memories;
  const ev = view.card.event!;
  const hosts = `${ev.partnerA} & ${ev.partnerB}`;
  const title = formatIcu(t.guestPageTitle!, { hosts });
  const photo = (id: string, size: 'thumb' | 'full') =>
    `${o.apiUrl}/v1/c/${encodeURIComponent(o.token)}/memories/${encodeURIComponent(id)}/${size}`;
  const items = view.memories
    .map((x) => {
      const alt = x.caption
        ? formatIcu(t.photoAlt!, { caption: x.caption })
        : t.photoAltNoCaption!;
      return `<li><figure>${x.takenOn ? `<time datetime="${esc(x.takenOn)}">${esc(dateText(x.takenOn, o.locale))}</time>` : ''}
<a href="${esc(photo(x.id, 'full'))}" data-full><img src="${esc(photo(x.id, 'thumb'))}" alt="${esc(alt)}" width="${x.width}" height="${x.height}" loading="lazy" decoding="async"></a>
${x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : ''}</figure></li>`;
    })
    .join('');
  return shell({
    locale: o.locale,
    title,
    palette: resolvePalette(ev.themeId, ev.palette),
    head: `<style>${CSS}</style>`,
    body: `<main class="mem">${brandLogo(o.brand)}
<a class="back" href="/c/${esc(encodeURIComponent(o.token))}">← ${esc(t.backToCard!)}</a>
<h1>${esc(title)}</h1>
${trustStrip(view.card, o.locale, o.domain)}
<ol data-testid="memories-list">${items}</ol>
<dialog id="viewer"><img alt=""><button type="button" aria-label="${esc(t.close!)}">✕</button></dialog>
${langChip(o.locale)}</main>`,
    script: `<script>(function(){var d=document.getElementById('viewer');if(!d||!d.showModal)return;var i=d.querySelector('img');document.querySelectorAll('[data-full]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();i.src=a.href;i.alt=a.querySelector('img').alt;d.showModal()})});d.querySelector('button').onclick=function(){d.close()};document.querySelectorAll('[data-lang]').forEach(function(b){b.onclick=function(){document.cookie='NEXT_LOCALE='+b.getAttribute('data-lang')+'; path=/; max-age=31536000; samesite=lax';location.reload()}})})()</script>`,
  });
}

export function renderMemoriesUnavailable(
  o: Pick<LightCardOptions, 'locale' | 'domain' | 'brand'>,
): string {
  const t = (messages[o.locale] as unknown as { memories: Msg }).memories;
  return shell({
    locale: o.locale,
    title: t.unavailableTitle!,
    palette: resolvePalette(undefined),
    body: `<main class="problem" data-testid="memories-unavailable">${brandLogo(o.brand)}
<h1>${esc(t.unavailableTitle!)}</h1><p>${esc(t.unavailableBody!)}</p>
<p class="muted" style="font-size:14px">${esc(o.domain)}</p>${langChip(o.locale)}</main>`,
  });
}
```

If `shell` only accepts its own CSS, inline `CSS` through the `head` option as shown. Check `CardView.event` has `partnerA`/`partnerB`/`themeId`/`palette` (it does in `mapCard`). Use the same Swahili date formatter the card uses (`../dates`) if it has one, instead of `Intl` (the `sw-TZ` locale data in Node may be missing).

- [ ] **Step 5: The route**

`apps/web/app/c/[token]/kumbukumbu/route.ts` (copy `localeOf`, `html`, branding and `API_URL` from `apps/web/app/c/[token]/route.ts`; extract them into `apps/web/src/lib/light-card/route-utils.ts` and import from both so they are not duplicated):

```ts
import { createHttpRepository, isRepositoryError, type GuestMemoriesView } from '@harusi/api-client';
import { APP_DOMAIN, USE_MOCKS } from '@/lib/env';
import { peekGuestMemoriesOnServer } from '@/lib/server-mock';
import { renderProblem } from '@/lib/light-card/render';
import { renderMemories, renderMemoriesUnavailable } from '@/lib/light-card/memories';
import { API_URL, brandOf, html, localeOf } from '@/lib/light-card/route-utils';

export const dynamic = 'force-dynamic';

/** Kumbukumbu (ADR 050): the couple's photos for one guest, by their card token. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = localeOf(req);
  const base = { locale, domain: APP_DOMAIN, brand: await brandOf() };
  let view: GuestMemoriesView;
  try {
    view = USE_MOCKS
      ? peekGuestMemoriesOnServer(token)
      : await createHttpRepository(API_URL).getGuestMemories(token);
  } catch (e) {
    const code = isRepositoryError(e) ? e.code : 'server';
    const reason = isRepositoryError(e) ? (e.details as { reason?: string } | undefined)?.reason : undefined;
    if (code === 'reissued') return html(renderProblem('reissued', base));
    if (reason === 'memories_unavailable') return html(renderMemoriesUnavailable(base), 404);
    if (code === 'not_found' || code === 'invalid_token') return html(renderProblem('invalid', base), 404);
    return html(renderProblem('error', base), 503);
  }
  return html(
    renderMemories(view, { token, ...base, mode: USE_MOCKS ? 'mock' : 'api', apiUrl: API_URL }),
  );
}
```

Check `RepositoryError` carries `details`; if not, add it in `packages/api-client/src/errors.ts` and pass it through `fail()`.

The `apiUrl` used in `<img src>` must be the **public** API URL that browsers can reach. Check whether the card route's `API_URL` is internal-only in production (memory note: prod URLs come from `PUBLIC_API_URL`). If it is internal, use the public one for `apiUrl` here, and for `img-src` in the CSP (search for `Content-Security-Policy` in `apps/web`) add the public API origin.

- [ ] **Step 6: Short link**

`apps/web/app/s/[code]/k/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation';
import { cardTokenFromShortPath } from '@/lib/short-link';

/** SMS link for Kumbukumbu (ADR 050): `/s/<token>/k` → the guest's memories page. */
export default async function ShortMemories({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const token = cardTokenFromShortPath(code);
  if (!token) notFound();
  redirect(`/c/${token}/kumbukumbu`);
}
```

- [ ] **Step 7: The card's Kumbukumbu button**

In `renderCard`, when `view.memoriesAvailable` is true, add under the date/venue block a secondary button `<a class="btn secondary" href="/c/{token}/kumbukumbu" data-testid="card-memories">{memories.openCardMemories}</a>`. Add `memories` to the message keys the card picks for its HTML (`pickMessages`/`SCRIPT_KEYS` if needed). Add a test in `render.test.ts`: present when `memoriesAvailable: true`, absent when false.

- [ ] **Step 8: Offline, mock and dev states**

- Service worker: cache `/c/<token>/kumbukumbu` like `/c/<token>` (network first, cache fallback) and cache thumbnails (`/v1/c/*/memories/*/thumb`) cache-first with a cap of 40 entries. Follow the existing card SW logic.
- `server-mock.ts`: `peekGuestMemoriesOnServer(token)` returns the mock card plus two sample memories with ids `dev-1` and `dev-2`. Add two small WebP files at `apps/web/public/dev/memories/dev-1.webp` and `dev-2.webp` (make them with sharp: 640×427 solid emerald and gold), and in mock mode pass `apiUrl: ''` with a photo URL builder that returns `/dev/memories/<id>.webp`; give `renderMemories` an optional `photoUrl?: (id, size) => string` option for this, defaulting to the API URL.
- `/dev/states`: add links for the list, empty-is-unavailable and reissued states.

- [ ] **Step 9: Run tests and check in the browser**

Run: `pnpm --filter @harusi/web test && pnpm --filter @harusi/web typecheck`
Then start the web dev server with mocks (`preview_start`, name from `.claude/launch.json`), open `/c/<a mock token>/kumbukumbu` at 360 px and 412 px, and run axe through Playwright as the existing card e2e does (search `apps/web/e2e` for `AxeBuilder`). Add an e2e spec `apps/web/e2e/memories.spec.ts` covering the list, the unavailable state and the viewer dialog, with zero serious axe issues.

- [ ] **Step 10: Commit**

```bash
git add apps/web packages/api-client/src/errors.ts
git commit -m "feat(web): guest Kumbukumbu page, SMS short link and card button"
```

---

### Task 10: Console screen, share button and send option (web)

**Files:**
- Create: `apps/web/app/app/e/[id]/kumbukumbu/page.tsx`, `apps/web/src/components/console/memory-photo.tsx`
- Modify: `apps/web/src/components/console/shell.tsx` (nav item), `apps/web/src/lib/queries.ts` (`qk.memories`), `apps/web/app/app/e/[id]/guests/[gid]/page.tsx` (share button), `apps/web/app/app/e/[id]/send/page.tsx` (Kumbukumbu option), `apps/web/app/app/e/[id]/settings/page.tsx` (on/off switch)
- Test: `apps/web/e2e/console-memories.spec.ts`

**Interfaces:**
- Consumes: repository methods from Task 7, strings from Task 8.

- [ ] **Step 1: Nav item**

In `shell.tsx` add `'memories'` to `NavKey`, import `Images` from `lucide-react`, and add to `secondary` after `cards`:

```tsx
      // ADR 050: the couple's photos for their guests (owner and committee).
      {
        key: 'memories',
        href: `${base}/kumbukumbu`,
        icon: <Images className={i} aria-hidden="true" />,
      },
```

Check where `navItems` filters by role so `gate` never sees it (gate has no console access, ADR 005, so nothing to add).

- [ ] **Step 2: Authenticated thumbnail component**

`apps/web/src/components/console/memory-photo.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getRepository } from '@/lib/repo';

/** A memory thumbnail for the console: the API needs the Bearer token, so it is fetched as a blob. */
export function MemoryPhoto({
  eventId,
  memoryId,
  alt,
  width,
  height,
}: {
  eventId: string;
  memoryId: string;
  alt: string;
  width: number;
  height: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let live = true;
    getRepository()
      .fetchMemoryPhoto(eventId, memoryId, 'thumb')
      .then((b) => {
        if (!live) return;
        url = URL.createObjectURL(b);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [eventId, memoryId]);
  return src ? (
    <img src={src} alt={alt} width={width} height={height} className="h-auto w-full rounded-xl" />
  ) : (
    <div
      className="w-full animate-pulse rounded-xl bg-border"
      style={{ aspectRatio: `${width} / ${height}` }}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 3: The page**

`apps/web/app/app/e/[id]/kumbukumbu/page.tsx`, built from the components the billing page uses (`PageHeader`, `QueryState`, `Card`, `EmptyState`, `Banner`, `Button`, `TextField`, `useToast`) and the confirmation sheet used for deleting a guest (search `ConfirmSheet` in `apps/web/src/components/ui`):

```tsx
'use client';

import { use, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ImagePlus, Lock, Pencil, Trash2 } from 'lucide-react';
import { isRepositoryError, type Memory } from '@harusi/api-client';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { MemoryPhoto } from '@/components/console/memory-photo';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, Skeleton } from '@/components/ui/display';
import { TextField } from '@/components/ui/form';
import { ConfirmSheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';

/** Kumbukumbu (ADR 050): the couple's photos, shown to each guest by their card link. */
export default function MemoriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('memories');
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.memories(id), queryFn: () => getRepository().listMemories(id) });
  const refresh = () => qc.invalidateQueries({ queryKey: qk.memories(id) });
  const file = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const [takenOn, setTakenOn] = useState('');
  const [editing, setEditing] = useState<Memory | null>(null);
  const [deleting, setDeleting] = useState<Memory | null>(null);

  const errorText = (e: unknown) => {
    const reason = isRepositoryError(e) ? (e.details as { reason?: string } | undefined)?.reason : undefined;
    if (reason === 'invalid_image') return t('invalidImage');
    if (reason === 'too_large') return t('tooLarge');
    if (reason === 'quota_exceeded') return t('full', { limit: q.data?.limit ?? 30 });
    return t('uploadFailed');
  };

  const add = useMutation({
    mutationFn: (photo: File) =>
      getRepository().addMemory(id, photo, {
        caption: caption.trim() || undefined,
        takenOn: takenOn || undefined,
      }),
    onSuccess: () => {
      setCaption('');
      setTakenOn('');
      if (file.current) file.current.value = '';
      void refresh();
    },
    onError: (e) => toast.show({ tone: 'danger', message: errorText(e) }),
  });
  const save = useMutation({
    mutationFn: (m: Memory) =>
      getRepository().updateMemory(m.id, { caption: m.caption, takenOn: m.takenOn }),
    onSuccess: () => {
      setEditing(null);
      void refresh();
    },
  });
  const move = useMutation({
    mutationFn: ({ a, b }: { a: Memory; b: Memory }) =>
      Promise.all([
        getRepository().updateMemory(a.id, { sortOrder: b.sortOrder }),
        getRepository().updateMemory(b.id, { sortOrder: a.sortOrder }),
      ]),
    onSuccess: () => void refresh(),
  });
  const remove = useMutation({
    mutationFn: (m: Memory) => getRepository().deleteMemory(m.id),
    onSuccess: () => {
      setDeleting(null);
      void refresh();
    },
  });

  return (
    <>
      <PageHeader title={t('title')} />
      <QueryState query={q} loading={<Skeleton className="h-64" />}>
        {(v) =>
          !v.unlocked ? (
            <EmptyState
              icon={<Lock aria-hidden="true" />}
              title={t('lockedTitle')}
              body={t('lockedBody')}
              action={
                <Button asChild>
                  <Link href={`/app/e/${id}/billing`}>{t('lockedCta')}</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-6">
              <Card className="space-y-4 p-4">
                <p className="text-muted">{t('count', { count: v.count, limit: v.limit })}</p>
                <TextField label={t('caption')} value={caption} maxLength={140} onChange={(e) => setCaption(e.target.value)} />
                <TextField label={t('takenOn')} type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} />
                <input
                  ref={file}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label={t('add')}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) add.mutate(f);
                  }}
                />
                <Button
                  onClick={() => file.current?.click()}
                  loading={add.isPending}
                  disabled={v.count >= v.limit}
                >
                  <ImagePlus aria-hidden="true" /> {add.isPending ? t('uploading') : t('add')}
                </Button>
                {v.count >= v.limit && <p className="text-warning">{t('full', { limit: v.limit })}</p>}
              </Card>
              {v.memories.length === 0 ? (
                <EmptyState icon={<ImagePlus aria-hidden="true" />} title={t('empty')} />
              ) : (
                <ol className="grid gap-4 sm:grid-cols-2" data-testid="console-memories">
                  {v.memories.map((m, i) => (
                    <li key={m.id}>
                      <Card className="space-y-2 p-3">
                        <MemoryPhoto
                          eventId={id}
                          memoryId={m.id}
                          alt={m.caption ?? t('photoAltNoCaption')}
                          width={m.width}
                          height={m.height}
                        />
                        {m.takenOn && <p className="text-sm text-muted">{m.takenOn}</p>}
                        {m.caption && <p>{m.caption}</p>}
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" aria-label={t('moveUp')} disabled={i === 0} onClick={() => move.mutate({ a: m, b: v.memories[i - 1]! })}>
                            <ArrowUp aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" aria-label={t('moveDown')} disabled={i === v.memories.length - 1} onClick={() => move.mutate({ a: m, b: v.memories[i + 1]! })}>
                            <ArrowDown aria-hidden="true" />
                          </Button>
                          <Button variant="secondary" onClick={() => setEditing(m)}>
                            <Pencil aria-hidden="true" /> {t('edit')}
                          </Button>
                          <Button variant="danger" onClick={() => setDeleting(m)}>
                            <Trash2 aria-hidden="true" /> {t('delete')}
                          </Button>
                        </div>
                        {editing?.id === m.id && (
                          <div className="space-y-2">
                            <TextField label={t('caption')} value={editing.caption ?? ''} maxLength={140} onChange={(e) => setEditing({ ...editing, caption: e.target.value || null })} />
                            <TextField label={t('takenOn')} type="date" value={editing.takenOn ?? ''} onChange={(e) => setEditing({ ...editing, takenOn: e.target.value || null })} />
                            <Button onClick={() => save.mutate(editing)} loading={save.isPending}>{t('save')}</Button>
                          </div>
                        )}
                      </Card>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )
        }
      </QueryState>
      <ConfirmSheet
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={t('delete')}
        body={deleting?.caption ? t('deleteConfirm', { caption: deleting.caption }) : t('deleteConfirmNoCaption')}
        confirmLabel={t('delete')}
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  );
}
```

Before writing, open `buy-sheet.tsx`, `query-state.tsx`, `ui/display.tsx`, `ui/button.tsx`, `ui/form.tsx` and the existing confirm sheet, and match their exact prop names (`EmptyState` props, `Button` `variant` values and `asChild`, `toast.show` signature, `ConfirmSheet` path and props). Change only the prop names above to fit; keep the behaviour. In `queries.ts` add `memories: (id: string) => ['memories', id] as const` to `qk`.

- [ ] **Step 4: Page switch in settings**

In the settings page, next to the `pledgesEnabled` switch, add a switch labelled `memories.enabled` that PATCHes `memoriesEnabled` the same way.

- [ ] **Step 5: Share button on guest detail**

On `guests/[gid]/page.tsx`, when the guest has a phone and the event is unlocked (`listMemories(id).unlocked && count > 0`; reuse the query), add a secondary button `memories.share` that calls `getRepository().getMemoriesLink(gid)` and then `window.open(waUrl, '_blank', 'noopener')`. On `conflict`/`no_invitation` show a toast with `memories.unavailableBody`.

- [ ] **Step 6: Send option**

On the send page, add a third card-type option "Kumbukumbu" (only when unlocked and `count > 0`) that calls `getRepository().sendMemories(id, selectedGuestIds | undefined)` and shows `{sent, failed}` with the existing result view. Show `memories.sendBody` under it. The existing 402 handling (toast linking to Plan) applies.

- [ ] **Step 7: e2e**

`apps/web/e2e/console-memories.spec.ts` with mocks: sign in as in the existing console specs, open `/app/e/<mock id>/kumbukumbu`, upload `apps/web/e2e/fixtures/memory.jpg` (add a small JPEG) through `setInputFiles`, see it in `[data-testid=console-memories]`, edit its caption, delete it with the confirm sheet, and run axe with zero serious issues. Also check the locked state when the mock event is unpaid.

Run: `pnpm --filter @harusi/web exec playwright test e2e/console-memories.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): Kumbukumbu in the console, WhatsApp share and send option"
```

---

### Task 11: Mobile app screen and share

**Files:**
- Create: `apps/mobile/app/(app)/event/[id]/memories.tsx`
- Modify: `apps/mobile/package.json` (`expo-image-picker`), `apps/mobile/app.json` or `app.config.ts` (photo permission text), `apps/mobile/src/lib/queries.ts` (`useMemories`, `useAddMemory`, `useUpdateMemory`, `useDeleteMemory`), `apps/mobile/app/(app)/event/[id]/(tabs)/index.tsx` (entry row on Overview), `apps/mobile/app/(app)/event/[id]/guest/[gid].tsx` (share button), `apps/mobile/src/lib/i18n.tsx` if it picks namespaces
- Test: `apps/mobile/src/__tests__/memories.test.tsx`

- [ ] **Step 1: Install the picker**

Run: `pnpm --filter mobile exec expo install expo-image-picker` (check the package name of the mobile app in `apps/mobile/package.json`). In the Expo config plugins add:

```json
["expo-image-picker", { "photosPermission": "Kadi Sasa inahitaji picha zako ili uweke kumbukumbu za harusi." }]
```

No camera permission is needed: we only pick from the gallery.

- [ ] **Step 2: Query hooks** in `apps/mobile/src/lib/queries.ts`, following `useMembers`/`useInviteMember`:

```ts
export function useMemories(eventId: string) {
  return useQuery({ queryKey: ['memories', eventId], queryFn: () => getRepository().listMemories(eventId) });
}
export function useAddMemory(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { photo: Blob; caption?: string; takenOn?: string }) =>
      getRepository().addMemory(eventId, v.photo, { caption: v.caption, takenOn: v.takenOn }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memories', eventId] }),
  });
}
export function useUpdateMemory(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; caption?: string | null; takenOn?: string | null; sortOrder?: number }) =>
      getRepository().updateMemory(v.id, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memories', eventId] }),
  });
}
export function useDeleteMemory(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getRepository().deleteMemory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memories', eventId] }),
  });
}
```

React Native's `FormData` takes `{ uri, name, type }` rather than a `Blob`. Make `addMemory` in the HTTP repository accept `Blob | { uri: string; name: string; type: string }` (widen the interface type in Task 7's `repository.ts`) and append whichever it gets.

- [ ] **Step 3: Screen**

`apps/mobile/app/(app)/event/[id]/memories.tsx`, using the kit components `members.tsx` imports (`Screen`, `AppHeader`, `Button`, `Field`, `ConfirmSheet`, `ErrorState`, `Skeleton`, `Txt`, `Banner`):

```tsx
import { useState } from 'react';
import { Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useGlobalSearchParams } from 'expo-router';
import type { Memory } from '@harusi/api-client';
import { useAddMemory, useDeleteMemory, useMemories, useUpdateMemory } from '../../../../src/lib/queries';
import { useT } from '../../../../src/lib/i18n';
import { AppHeader } from '../../../../src/ui/header';
import { Banner, Button, ConfirmSheet, ErrorState, Field, Screen, Skeleton, Txt } from '../../../../src/ui/kit';
import { MemoryThumb } from '../../../../src/ui/memory-thumb';

/** Kumbukumbu (ADR 050): add, caption, reorder and delete the couple's photos. */
export default function Memories() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const q = useMemories(id);
  const add = useAddMemory(id);
  const update = useUpdateMemory(id);
  const del = useDeleteMemory(id);
  const [caption, setCaption] = useState('');
  const [takenOn, setTakenOn] = useState('');
  const [deleting, setDeleting] = useState<Memory | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function pick() {
    setErr(null);
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      exif: false,
    });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    add.mutate(
      {
        photo: { uri: a.uri, name: a.fileName ?? 'photo.jpg', type: a.mimeType ?? 'image/jpeg' },
        caption: caption.trim() || undefined,
        takenOn: takenOn || undefined,
      },
      {
        onSuccess: () => {
          setCaption('');
          setTakenOn('');
        },
        onError: () => setErr(t('memories.uploadFailed')),
      },
    );
  }

  if (q.isLoading) return <Screen><AppHeader title={t('memories.title')} /><Skeleton height={240} /></Screen>;
  if (q.isError || !q.data) return <Screen><AppHeader title={t('memories.title')} /><ErrorState onRetry={() => q.refetch()} /></Screen>;
  const v = q.data;
  if (!v.unlocked)
    return (
      <Screen>
        <AppHeader title={t('memories.title')} />
        <Txt variant="title">{t('memories.lockedTitle')}</Txt>
        <Txt>{t('memories.lockedBody')}</Txt>
        <Button onPress={() => router.push(`/event/${id}/karibu`)}>{t('memories.lockedCta')}</Button>
      </Screen>
    );
  return (
    <Screen scroll>
      <AppHeader title={t('memories.title')} />
      <Txt muted>{t('memories.count', { count: v.count, limit: v.limit })}</Txt>
      <Field label={t('memories.caption')} value={caption} onChangeText={setCaption} maxLength={140} />
      <Field label={t('memories.takenOn')} value={takenOn} onChangeText={setTakenOn} placeholder="2019-03-02" keyboardType="numbers-and-punctuation" />
      {err && <Banner tone="danger">{err}</Banner>}
      <Button onPress={pick} loading={add.isPending} disabled={v.count >= v.limit}>
        {add.isPending ? t('memories.uploading') : t('memories.add')}
      </Button>
      {v.memories.length === 0 ? (
        <Txt>{t('memories.empty')}</Txt>
      ) : (
        v.memories.map((m, i) => (
          <View key={m.id} style={{ gap: 8, marginTop: 16 }}>
            <MemoryThumb eventId={id} memory={m} />
            {m.takenOn ? <Txt muted>{m.takenOn}</Txt> : null}
            {m.caption ? <Txt>{m.caption}</Txt> : null}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="ghost" accessibilityLabel={t('memories.moveUp')} disabled={i === 0}
                onPress={() => { const o = v.memories[i - 1]!; update.mutate({ id: m.id, sortOrder: o.sortOrder }); update.mutate({ id: o.id, sortOrder: m.sortOrder }); }}>↑</Button>
              <Button variant="ghost" accessibilityLabel={t('memories.moveDown')} disabled={i === v.memories.length - 1}
                onPress={() => { const o = v.memories[i + 1]!; update.mutate({ id: m.id, sortOrder: o.sortOrder }); update.mutate({ id: o.id, sortOrder: m.sortOrder }); }}>↓</Button>
              <Button variant="danger" onPress={() => setDeleting(m)}>{t('memories.delete')}</Button>
            </View>
          </View>
        ))
      )}
      <ConfirmSheet
        visible={!!deleting}
        title={t('memories.delete')}
        body={deleting?.caption ? t('memories.deleteConfirm', { caption: deleting.caption }) : t('memories.deleteConfirmNoCaption')}
        confirmLabel={t('memories.delete')}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </Screen>
  );
}
```

Match the kit's real prop names (open `apps/mobile/src/ui/kit.tsx`), as in Task 10. Create `apps/mobile/src/ui/memory-thumb.tsx`: an `Image` whose source is `{ uri: apiBase + repository.memoryPhotoPath(...), headers: { Authorization: 'Bearer ' + accessToken } }` (React Native `Image` supports headers on Android), with `aspectRatio: width / height` and a Skeleton while loading. Get the base URL and token the same way `src/lib/repo.ts` does. Editing a caption on mobile can follow in a later change (only add, reorder and delete are in this screen). Note that in the ADR.

- [ ] **Step 4: Entry points and share**

- Overview tab: a row "Kumbukumbu" with the count, pushing `/event/${id}/memories`. Hide it for `gate` (the role shell already hides everything for gate).
- Guest detail: a button `memories.share` (when the guest has a phone and memories are available) that calls `getRepository().getMemoriesLink(gid)` and `Linking.openURL(waUrl)`.

- [ ] **Step 5: Test**

`apps/mobile/src/__tests__/memories.test.tsx`, following the existing screen tests in that folder (render with the mock repository): locked state shows `lockedTitle`; with a paid mock event and two memories it shows both captions; pressing delete then confirm removes one.

Run: `pnpm --filter mobile test`
Expected: PASS. Then `pnpm --filter mobile typecheck`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile packages/api-client pnpm-lock.yaml
git commit -m "feat(mobile): Kumbukumbu screen and WhatsApp share from guest detail"
```

---

### Task 12: ADR, privacy, operations notes, full check

**Files:**
- Create: `docs/adr/050-memories-page.md`
- Modify: the privacy page source (search `apps/web/app/(public)/privacy` or `apps/web/src/content` for the policy text), `infra/coolify/` deploy notes (volume and backup), `CLAUDE.md` §17.8 guest routes list (add `/c/[token]/kumbukumbu`, `/s/[code]/k`)

- [ ] **Step 1: ADR 050**

```markdown
# ADR 050: Kumbukumbu, the couple's photo memories for their guests

Status: accepted. API, web console, guest page, mobile app and tests are built.

## Context

Hosts want to share photos of their journey with guests. It should be a reason to buy cards, never
reveal anything private, and work for guests on slow phones.

## Decision

1. **Unlock:** any paid card order (`event_purchases.kind = 'cards'`, `status = 'paid'`). Packs and
   staff grants do not unlock it. No separate price.
2. **Content:** up to 30 photos per event (`events.memories_limit`, staff with `plan` change it), each
   with an optional caption (≤ 140) and date. Ordered by date, undated last, then the host's order.
3. **Who:** owner and committee manage; gate agents cannot; guests only view.
4. **Guest access by card token:** `/c/<token>/kumbukumbu`. A reissued card's old link is refused. A
   switched-off, locked or empty page reads "not available" with no mention of payment.
5. **Storage:** files on a persistent volume (`PHOTO_FILES_DIR`) behind `PhotoStore`; MinIO or R2
   later is a new implementation only. Photos are served by the API after a token or role check,
   `cache-control: private`.
6. **Privacy:** every upload is re-encoded to WebP (1280 px and 320 px) by sharp, which drops all
   metadata, so GPS locations never leak. JPEG, PNG and WebP only (prebuilt sharp has no HEIC).
   Deleting a memory, an event or the owner's account deletes the files.
7. **Delivery:** the host shares each guest's link from their own WhatsApp (`wa.me`, free), or we send
   it (message kind `memories`, WhatsApp template `kumbukumbu_link` with SMS fallback), spending one
   reminder credit per message that is not a failure (ADR 042). SMS link: `/s/<token>/k`.

## Consequences

- The photo volume must be backed up with the database.
- Until Meta approves `kumbukumbu_link`, WhatsApp sends fall back to text (only inside the 24-hour
  window) and then SMS.
- The mobile app adds, reorders and deletes photos; editing captions is in the web console only.
```

- [ ] **Step 2: Privacy sentence** (both languages), in the section about what hosts share with guests: "Hosts may share photos with their guests on a private page. We remove location and camera details from every photo." / "Wenyeji wanaweza kushiriki picha na wageni wao kwenye ukurasa wa faragha. Tunaondoa taarifa za mahali na kamera kwenye kila picha."

- [ ] **Step 3: Operations note** in `infra/coolify/` (the deploy notes file that documents `APP_FILES_DIR`): add `PHOTO_FILES_DIR=/data/photo-files` on a persistent volume, and add the directory to the nightly backup next to `pg_dump` (`RESTORE.md`: how to restore it).

- [ ] **Step 4: Full check**

Run: `pnpm -r typecheck && pnpm -r lint && pnpm -r test`
Expected: all green. Then the web e2e suite for the card and the new specs.

- [ ] **Step 5: Commit**

```bash
git add docs CLAUDE.md infra apps/web
git commit -m "docs: ADR 050 Kumbukumbu, privacy note and photo volume backup"
```

---

## Self-review notes

- Spec coverage: unlock (T3), content and limits (T1, T3, T5), image processing and privacy (T2), API organizer (T3), guest (T4), deletion and PDPA (T5), sending and share (T6), client (T7), strings (T8), guest page, short link, card button, offline, dev states (T9), console (T10), mobile (T11), ADR, privacy and backups (T12). Tests listed in the spec are in T2–T6, T9–T11.
- Names used across tasks: `MemoriesService` (`unlocked`, `list`, `add`, `update`, `remove`, `photo`, `purgeEvent`, `availableFor`, `guestEvent`, `forGuest`, `opsSetLimit`), `CardService.resolveToken`, `DeliveryService.sendMemories` / `memoriesLink`, `photosOf`, `processPhoto`, `MemoryPhotoStore.files`, repository `listMemories` / `addMemory` / `updateMemory` / `deleteMemory` / `fetchMemoryPhoto` / `memoryPhotoPath` / `sendMemories` / `getMemoriesLink` / `getGuestMemories` / `opsSetMemoriesLimit`, types `Memory`, `MemoriesAdminView`, `GuestMemoriesView`, `CardView.memoriesAvailable`.
