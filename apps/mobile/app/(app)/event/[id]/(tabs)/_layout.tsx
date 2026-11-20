import { View } from 'react-native';
import { Tabs, useGlobalSearchParams } from 'expo-router';
import { allowsDonations } from '@harusi/schemas';
import { useEvent } from '../../../../../src/lib/queries';
import { useLocale, useT } from '../../../../../src/lib/i18n';
import { useColors, useIsDark } from '../../../../../src/lib/theme';
import { AppHeader } from '../../../../../src/ui/header';
import { Icon, type IconName } from '../../../../../src/ui/icons';
import { formatDate } from '../../../../../src/lib/format';

const ICON: Record<string, IconName> = {
  index: 'overview',
  guests: 'guests',
  send: 'send',
  gate: 'gate',
  pledges: 'pledges',
};

/** Five tabs (§17.3). Gate agents get the Gate tab only; committee never sees settings or members. */
export default function Tabs_() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const dark = useIsDark();
  const { locale } = useLocale();
  const q = useEvent(id);
  const role = (q.data as { myRole?: string } | undefined)?.myRole ?? 'owner';
  const gateOnly = role === 'gate';
  const hide = (cond: boolean) => (cond ? { href: null } : {});
  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title={q.data?.coupleNames ?? t('common.loading')}
        subtitle={
          q.data ? `${formatDate(q.data.dateStart, locale)} · ${q.data.venueName}` : undefined
        }
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.muted,
          tabBarStyle: gateOnly
            ? { display: 'none' }
            : {
                minHeight: 72,
                paddingTop: 8,
                paddingBottom: 10,
                backgroundColor: c.surface,
                borderTopWidth: 1,
                borderTopColor: c.border,
                shadowColor: '#0A3F35',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: dark ? 0 : 0.04,
                shadowRadius: 12,
                elevation: 4,
              },
          tabBarLabelStyle: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
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
              tabBarIcon: ({ color, focused }) => (
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 4,
                    borderRadius: 16,
                    backgroundColor: focused ? c.primarySoft : 'transparent',
                  }}
                >
                  <Icon
                    name={ICON[name]!}
                    size={22}
                    color={color}
                    strokeWidth={focused ? 2.4 : 1.9}
                  />
                </View>
              ),
              ...hide(gateOnly && name !== 'gate'),
              ...(name === 'pledges' &&
              ((role !== 'owner' && role !== 'committee') ||
                !allowsDonations(q.data?.eventKind, q.data?.pledgesEnabled))
                ? { href: null }
                : {}),
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}
