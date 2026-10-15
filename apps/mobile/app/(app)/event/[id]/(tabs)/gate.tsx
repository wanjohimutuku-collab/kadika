import { useGlobalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { getAccessToken, getRepository } from '../../../../../src/lib/repo';
import { useEvent } from '../../../../../src/lib/queries';
import { GateScreen } from '../../../../../src/gate/GateScreen';
import { ErrorState, Skeleton } from '../../../../../src/ui/kit';

/** Gate tab: any owner, committee member or gate-role member can run the gate from their phone (P11). */
export default function Gate() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const q = useEvent(id);
  if (q.isPending)
    return (
      <View style={{ padding: 16 }}>
        <Skeleton height={120} />
      </View>
    );
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const role = q.data.myRole ?? 'owner';
  return (
    <GateScreen
      eventId={id}
      role={role}
      token={getAccessToken}
      refresh={async () => {
        await getRepository().getSession(); // refreshes the access token when it has expired
      }}
    />
  );
}
