import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { loadGateSession } from '../src/gate/gate-session';

export default function Index() {
  const [gate, setGate] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void loadGateSession().then((g) => setGate(g?.eventId ?? null));
  }, []);
  if (gate === undefined)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  // Gate-only mode: open straight into the scanner when a gate session is active, or /gate-join.
  return <Redirect href={gate ? `/gate/${gate}` : '/gate-join'} />;
}
