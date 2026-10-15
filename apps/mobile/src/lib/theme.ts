import { useColorScheme } from 'react-native';
import { darkColors, lightColors, radius, spacing } from '@harusi/ui-tokens';

export type Colors = Record<keyof typeof lightColors, string>;
/** §17.2 tokens; the organizer app follows the system light/dark setting. */
export function useColors(): Colors {
  return useColorScheme() === 'dark' ? darkColors : lightColors;
}
export { radius, spacing };
