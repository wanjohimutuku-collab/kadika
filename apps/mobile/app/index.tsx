import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../src/lib/session';

export default function Index() {
  const { ready, session } = useSession();
  if (!ready)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  return <Redirect href={session ? '/events' : '/welcome'} />;
}
