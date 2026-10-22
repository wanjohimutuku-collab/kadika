import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, loginAs, loginAsStaff, type TestContext } from './testing/test-app';

let ctx: TestContext;
const dir = mkdtempSync(join(tmpdir(), 'app-files-'));
beforeAll(async () => {
  ctx = await createTestContext({ env: { APP_FILES_DIR: dir } });
});
afterAll(async () => {
  await ctx.close();
  rmSync(dir, { recursive: true, force: true });
});

/** A fake APK: a zip header and the manifest entry name, padded past the 1 MB minimum. */
function fakeApk(fill = 7): Uint8Array {
  const b = new Uint8Array(1_200_000).fill(fill);
  b.set([0x50, 0x4b, 0x03, 0x04], 0);
  b.set(new TextEncoder().encode('AndroidManifest.xml'), 30);
  return b;
}

const upload = (token: string, bytes: Uint8Array, version: string) =>
  ctx.app.request(`/v1/ops/app/android?version=${version}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' },
    body: bytes,
  });

describe('Android app download from our own domain (ADR 047)', () => {
  it('is "not found" until admin staff upload one, then downloads with its checksum', async () => {
    expect((await ctx.app.request('/v1/app/android')).status).toBe(404);
    expect((await ctx.app.request('/v1/app/android.apk')).status).toBe(404);

    const admin = await loginAsStaff(ctx, '0746000001', 'admin');
    const apk = fakeApk();
    const res = await upload(admin.accessToken, apk, '0.6.0');
    expect(res.status).toBe(200);
    const sha256 = createHash('sha256').update(apk).digest('hex');
    expect(await res.json()).toMatchObject({ version: '0.6.0', size: apk.length, sha256 });

    const meta = await ctx.app.request('/v1/app/android'); // public, no sign-in
    expect(await meta.json()).toMatchObject({ version: '0.6.0', sha256 });
    const dl = await ctx.app.request('/v1/app/android.apk');
    expect(dl.status).toBe(200);
    expect(dl.headers.get('content-type')).toBe('application/vnd.android.package-archive');
    expect(dl.headers.get('content-disposition')).toContain('kadi-sasa-0.6.0.apk');
    const got = new Uint8Array(await dl.arrayBuffer());
    expect(createHash('sha256').update(got).digest('hex')).toBe(sha256);

    // a newer upload replaces it
    await upload(admin.accessToken, fakeApk(9), '0.6.1');
    expect(await (await ctx.app.request('/v1/app/android')).json()).toMatchObject({
      version: '0.6.1',
    });
  });

  it('refuses non-admins, bad versions and files that are not an APK', async () => {
    const support = await loginAsStaff(ctx, '0746000002', 'support');
    expect((await upload(support.accessToken, fakeApk(), '1.0.0')).status).toBe(403);
    const host = await loginAs(ctx, '0746000003');
    expect((await upload(host.accessToken, fakeApk(), '1.0.0')).status).toBe(403);

    const admin = await loginAsStaff(ctx, '0746000004', 'admin');
    expect((await upload(admin.accessToken, fakeApk(), 'latest')).status).toBe(400);
    const notApk = new Uint8Array(1_200_000).fill(1);
    expect((await upload(admin.accessToken, notApk, '1.0.0')).status).toBe(400);
    expect((await upload(admin.accessToken, new Uint8Array(10), '1.0.0')).status).toBe(400);
  });
});
