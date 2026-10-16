import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';

import { getPushStatus, registerForPush } from './push';

export const pushStatusKey = ['push-status'] as const;

export function usePushStatus() {
  return useQuery({ queryKey: pushStatusKey, queryFn: getPushStatus, staleTime: 0 });
}

/** „Aktivieren“: erneut fragen – oder, wenn im System abgelehnt, die App-Einstellungen öffnen. */
export function useEnablePush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const status = await registerForPush({ prompt: true });
      if (status === 'denied') await Linking.openSettings();
      return status;
    },
    onSuccess: (status) => queryClient.setQueryData(pushStatusKey, status),
  });
}
