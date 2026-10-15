import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../src/lib/session';
import { loadGateSession } from '../src/gate/gate-session';

export default function Index() {
  const { ready, session } = useSession();
  const [gate, setGate] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void loadGateSession().then((g) => setGate(g?.eventId ?? null));
  }, []);
  if (!ready || gate === undefined)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  // a phone that joined as a gate agent opens straight into the scanner, even with no network
  if (!session && gate) return <Redirect href={`/gate/${gate}`} />;
  return <Redirect href={session ? '/events' : '/welcome'} />;
}
