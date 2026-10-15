import { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { GateScreen } from '../../src/gate/GateScreen';
import { clearGateSession, loadGateSession, type GateSession } from '../../src/gate/gate-session';

/** Kiosk gate for an agent who joined with a link + PIN: only the scanner, nothing else (§17.3). */
export default function GateKiosk() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<GateSession | null | undefined>(undefined);
  useEffect(() => {
    void loadGateSession().then(setSession);
  }, []);
  if (session === undefined) return null;
  if (!session || session.eventId !== id) return <Redirect href="/welcome" />;
  return (
    <GateScreen
      eventId={id}
      role="gate"
      token={() => session.token}
      refresh={async () => {
        // the 24-hour gate token expired: the agent has to join again (their scans stay on the phone)
        await clearGateSession();
        setSession(null);
      }}
    />
  );
}
