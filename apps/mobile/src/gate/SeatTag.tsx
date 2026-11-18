import { Text, View } from 'react-native';
import { seatType } from '@harusi/schemas/seat-type';

/**
 * Card type at the gate: the SINGLE / DOUBLE printed on the guest's card, big enough to read at arm's
 * length, so the agent knows whether one or two people walk in on it. Family cards (3+) show the count.
 */
export function SeatTag({
  seats,
  locale,
  color,
}: {
  seats: number;
  locale: 'sw' | 'en';
  color: string;
}) {
  const n = Math.max(1, seats);
  const type = seatType(n);
  const word =
    type === 'D' ? 'DOUBLE' : type === 'S' ? 'SINGLE' : locale === 'sw' ? 'FAMILIA' : 'FAMILY';
  const count =
    locale === 'sw' ? (n === 1 ? 'mgeni 1' : `wageni ${n}`) : n === 1 ? '1 guest' : `${n} guests`;
  return (
    <View
      accessible
      accessibilityLabel={`${word}, ${count}`}
      testID="gate-seat-type"
      style={{
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: color,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 5,
        marginTop: 6,
      }}
    >
      <Text style={{ color, fontSize: 18, fontWeight: '900', letterSpacing: 2 }}>{word}</Text>
      <Text style={{ color, fontSize: 15, fontWeight: '600', opacity: 0.85 }}>· {count}</Text>
    </View>
  );
}
