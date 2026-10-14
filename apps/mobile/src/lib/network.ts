import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/** Connects react-query's online state to the device: paused writes resume when the network returns. */
export function setupNetwork(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((s) =>
      setOnline(s.isConnected !== false && s.isInternetReachable !== false),
    ),
  );
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(
    () =>
      NetInfo.addEventListener((s) =>
        setOnline(s.isConnected !== false && s.isInternetReachable !== false),
      ),
    [],
  );
  return online;
}
