import { Image, View } from 'react-native';
import type { Memory } from '@harusi/api-client';
import { API_URL, getAccessToken } from '../lib/repo';
import { radius, useColors } from '../lib/theme';

/**
 * A Kumbukumbu photo at 640 px (ADR 050). The API checks the Bearer token for every photo, so the image is
 * requested with it (React Native's Image sends headers on Android and iOS).
 */
export function MemoryThumb({
  eventId,
  memory,
  fallbackLabel,
}: {
  eventId: string;
  memory: Memory;
  /** Read out when the photo has no caption. */
  fallbackLabel: string;
}) {
  const c = useColors();
  const token = getAccessToken();
  return (
    <View
      style={{
        width: '100%',
        aspectRatio: memory.width / memory.height,
        borderRadius: radius.card,
        overflow: 'hidden',
        backgroundColor: c.border,
      }}
    >
      {token ? (
        <Image
          accessibilityLabel={memory.caption ?? fallbackLabel}
          source={{
            uri: `${API_URL}/v1/events/${encodeURIComponent(eventId)}/memories/${encodeURIComponent(memory.id)}/medium`,
            headers: { Authorization: `Bearer ${token}` },
          }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
}
