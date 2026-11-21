import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../src/lib/session';

export default function AuthLayout() {
  const { ready, session } = useSession();
  if (ready && session) return <Redirect href="/events" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
