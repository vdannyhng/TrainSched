import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { Platform } from 'react-native';

import { shouldPersistQuery } from './persist';
import { encryptedStorage } from './secureStorage';

const DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Lange im Speicher halten, damit der persistierte Cache offline lesbar bleibt
      gcTime: 7 * DAY,
    },
    // Offline nicht endlos „laden“, sondern sofort mit Netzwerkfehler antworten
    mutations: { networkMode: 'always' },
  },
});

// Native: Online-Status aus expo-network (Web nutzt die Browser-Events von TanStack Query)
if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) => {
    const subscription = Network.addNetworkStateListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => subscription.remove();
  });
}

// Offline-Cache enthält Notizen → verschlüsselt speichern (siehe secureStorage.ts)
export const queryPersister = createAsyncStoragePersister({
  storage: encryptedStorage,
  key: 'trainsched-query-cache',
  throttleTime: 2000,
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: 7 * DAY,
  // Bei Schema-Änderungen hochzählen → alter Cache wird verworfen
  buster: 'v1',
  // Web: kein Offline-Cache – im Browser gibt es keinen sicheren Schlüsselspeicher (geteilte PCs!)
  dehydrateOptions: { shouldDehydrateQuery: Platform.OS === 'web' ? () => false : shouldPersistQuery },
};

// Web: evtl. vorhandenen Cache aus älteren Versionen entfernen
if (Platform.OS === 'web') void queryPersister.removeClient();
