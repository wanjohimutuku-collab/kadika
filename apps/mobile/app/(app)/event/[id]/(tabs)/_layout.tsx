import { Text, View } from 'react-native';
import { Tabs, useGlobalSearchParams } from 'expo-router';
import { useEvent } from '../../../../../src/lib/queries';
import { useT } from '../../../../../src/lib/i18n';
import { useColors } from '../../../../../src/lib/theme';
import { AppHeader } from '../../../../../src/ui/header';

const ICON: Record<string, string> = {
  index: '◎',
  guests: '☰',
  send: '➤',
  gate: '⛩',
  pledges: '₮',
};

/** Five tabs (§17.3). Gate agents get the Gate tab only; committee never sees settings or members. */
export default function Tabs_() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const q = useEvent(id);
  const role = (q.data as { myRole?: string } | undefined)?.myRole ?? 'owner';
  const gateOnly = role === 'gate';
  const hide = (cond: boolean) => (cond ? { href: null } : {});
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={q.data?.coupleNames ?? t('common.loading')} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.muted,
          tabBarStyle: gateOnly
            ? { display: 'none' }
            : { minHeight: 60, backgroundColor: c.surface },
          tabBarLabelStyle: { fontSize: 12 },
        }}
      >
        {(
          [
            ['index', 'nav.overview'],
            ['guests', 'nav.guests'],
            ['send', 'nav.send'],
            ['gate', 'nav.gate'],
            ['pledges', 'nav.pledges'],
          ] as const
        ).map(([name, key]) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: t(key),
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>{ICON[name]}</Text>,
              ...hide(gateOnly && name !== 'gate'),
              ...(name === 'pledges' && role !== 'owner' && role !== 'committee'
                ? { href: null }
                : {}),
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}
