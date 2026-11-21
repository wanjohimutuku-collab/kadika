import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';

/**
 * Wraps `useCameraPermissions()` and re-checks permission status whenever the screen regains
 * focus or the app returns from the foreground (e.g. after allowing camera in OS Settings).
 */
export function useLiveCameraPermission() {
  const [perm, requestPerm, getPerm] = useCameraPermissions();

  useFocusEffect(
    useCallback(() => {
      void getPerm();
    }, [getPerm]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void getPerm();
    });
    return () => sub.remove();
  }, [getPerm]);

  const request = useCallback(async () => {
    const res = await requestPerm();
    if (!res.granted) return getPerm();
    return res;
  }, [getPerm, requestPerm]);

  return [perm, request, getPerm] as const;
}
