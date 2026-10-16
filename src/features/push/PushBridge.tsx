import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { pushStatusKey } from './usePushStatus';
import { registerForPush } from './push';

/**
 * Nach dem Login: Gerät für Push registrieren, beim Antippen einer Benachrichtigung
 * zum Ziel navigieren und im Vordergrund eingehende Pushes als Signal zum Neuladen nutzen.
 */
function NativePushBridge({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    void registerForPush({ prompt: true }).then(() =>
      queryClient.invalidateQueries({ queryKey: pushStatusKey }),
    );
  }, [userId, queryClient]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ['lessons'] });
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
    });
    return () => sub.remove();
  }, [queryClient]);

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) {
      router.push(url);
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
    }
    void Notifications.clearLastNotificationResponseAsync();
  }, [response, queryClient]);

  return null;
}

export const PushBridge: (props: { userId: string }) => null =
  Platform.OS === 'web' ? () => null : NativePushBridge;
