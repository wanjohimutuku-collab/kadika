import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../src/lib/session';

/** Everything under (app) needs a signed-in organizer. */
export default function AppLayout() {
  const { ready, session } = useSession();
  if (ready && !session) return <Redirect href="/welcome" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
