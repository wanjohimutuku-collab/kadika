import type { Admission, Bundle, GateApi, LocalScan, SyncResponse } from '@harusi/gate';
import { API_URL } from '../lib/repo';

/** HTTP calls of a gate device. `auth` returns the current bearer token and may refresh it. */
export function makeGateApi(
  eventId: string,
  auth: { token: () => string | null; refresh?: () => Promise<void> },
): GateApi {
  async function call(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
    const res = await fetch(`${API_URL}/v1/events/${eventId}/gate${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${auth.token() ?? ''}`,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    if (res.status === 401 && auth.refresh && !retried) {
      await auth.refresh();
      return call(path, init, true);
    }
    return res;
  }
  return {
    async sync(deviceId: string, scans: LocalScan[]): Promise<SyncResponse> {
      const res = await call('/scans/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId,
          scans: scans.map((s) => ({
            clientId: s.clientId,
            guestId: s.guestId,
            result: s.result,
            partyAdmitted: s.partyAdmitted,
            scannedAt: s.scannedAt,
            offline: s.offline,
            override: s.override,
            reason: s.reason,
          })),
        }),
      });
      if (!res.ok) throw new Error(`sync ${res.status}`);
      return (await res.json()) as SyncResponse;
    },
    async bundle(etag: string | null) {
      const res = await call('/bundle', { headers: etag ? { 'if-none-match': etag } : {} });
      if (res.status === 304) return { notModified: true as const };
      if (!res.ok) throw new Error(`bundle ${res.status}`);
      return { bundle: (await res.json()) as Bundle, etag: res.headers.get('etag') };
    },
    async admitted() {
      const res = await call('/admitted');
      if (!res.ok) throw new Error(`admitted ${res.status}`);
      return (await res.json()) as { admitted: Admission[] };
    },
  };
}
