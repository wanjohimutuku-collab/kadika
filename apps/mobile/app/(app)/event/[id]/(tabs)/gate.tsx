import { useEffect, useState } from 'react';
import { useGlobalSearchParams } from 'expo-router';
import { View } from 'react-native';
import type { GateRole } from '@harusi/gate';
import { getAccessToken, getRepository } from '../../../../../src/lib/repo';
import { useEvent } from '../../../../../src/lib/queries';
import { useOnline } from '../../../../../src/lib/network';
import { store } from '../../../../../src/lib/storage';
import { GateScreen } from '../../../../../src/gate/GateScreen';
import { Skeleton } from '../../../../../src/ui/kit';

const roleKey = (eventId: string) => `harusi.gate.role.${eventId}`;

/** Gate tab: any owner, committee member or gate-role member can run the gate from their phone (P11). */
export default function Gate() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const online = useOnline();
  const q = useEvent(id);
  const [cachedRole, setCachedRole] = useState<GateRole | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void store.get(roleKey(id)).then((r) => {
      if (!alive) return;
      if (r === 'owner' || r === 'committee' || r === 'gate') setCachedRole(r);
      setRoleLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const r = q.data?.myRole;
    if (r === 'owner' || r === 'committee' || r === 'gate') {
      setCachedRole(r);
      void store.set(roleKey(id), r);
    }
  }, [id, q.data?.myRole]);

  // While online and loading the first time, wait briefly for myRole; when offline or on error,
  // open GateScreen directly so an already-downloaded SQLite bundle works without network.
  if (q.isPending && online && !roleLoaded)
    return (
      <View style={{ padding: 16 }}>
        <Skeleton height={120} />
      </View>
    );

  // Least-privilege fallback ('gate') if myRole was never fetched yet.
  const role: GateRole = q.data?.myRole ?? cachedRole ?? 'gate';
  return (
    <GateScreen
      eventId={id}
      eventName={q.data?.coupleNames}
      role={role}
      token={getAccessToken}
      embedded
      refresh={async () => {
        await getRepository().getSession(); // refreshes the access token when it has expired
      }}
    />
  );
}
