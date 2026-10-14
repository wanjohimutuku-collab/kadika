import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Session tokens go to the OS keystore on devices; the web build (dev/preview only) uses localStorage. */
export const secureGet = async (key: string): Promise<string | null> => {
  try {
    return Platform.OS === 'web' ? localStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};
export const secureSet = async (key: string, value: string | null): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } else if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // a failed write only means the user signs in again next launch
  }
};

export const store = {
  get: (key: string) => AsyncStorage.getItem(key).catch(() => null),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value).catch(() => undefined),
  remove: (key: string) => AsyncStorage.removeItem(key).catch(() => undefined),
};
