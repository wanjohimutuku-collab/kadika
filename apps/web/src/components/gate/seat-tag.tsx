import { seatType } from '@harusi/schemas';
import { cn } from '@/lib/cn';

/**
 * Card type at the gate: the same SINGLE / DOUBLE the guest's card shows, large enough to read at
 * arm's length, so the agent knows at a glance whether one or two people walk in on this card.
 * Family cards (3+) show their count instead.
 */
export function GateSeatTag({
  seats,
  locale,
  className,
}: {
  seats: number;
  locale: 'sw' | 'en';
  className?: string;
}) {
  const n = Math.max(1, seats);
  const type = seatType(n);
  const word =
    type === 'D' ? 'Double' : type === 'S' ? 'Single' : locale === 'sw' ? 'Familia' : 'Family';
  const count =
    locale === 'sw' ? (n === 1 ? 'mgeni 1' : `wageni ${n}`) : n === 1 ? '1 guest' : `${n} guests`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border-2 border-current px-3 py-1 text-sm font-bold tracking-wider uppercase',
        className,
      )}
      data-testid="gate-seat-type"
      data-seat-type={type ?? 'F'}
    >
      {word}
      <span className="font-semibold tracking-normal normal-case opacity-80">· {count}</span>
    </span>
  );
}
