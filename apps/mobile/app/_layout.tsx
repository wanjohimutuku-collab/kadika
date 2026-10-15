import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider, useT } from '../src/lib/i18n';
import { SessionProvider } from '../src/lib/session';
import { setupNetwork, useOnline } from '../src/lib/network';
import { Banner } from '../src/ui/kit';
import { useColors } from '../src/lib/theme';

setupNetwork();

function OfflineBanner() {
  const online = useOnline();
  const t = useT();
  if (online) return null;
  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      <Banner tone="warning" text={t('states.offlineBanner')} />
    </View>
  );
}

export default function RootLayout() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Slow or no data is normal (§17.1): keep showing the last answer and retry gently.
          queries: {
            staleTime: 30_000,
            gcTime: 24 * 3_600_000,
            retry: 2,
            networkMode: 'offlineFirst',
          },
          mutations: { networkMode: 'online' }, // paused while offline, sent when the network returns
        },
      }),
  );
  const c = useColors();
  useEffect(() => undefined, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <I18nProvider>
          <SessionProvider>
            <StatusBar style="auto" />
            <OfflineBanner />
            <Stack
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}
            />
          </SessionProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
