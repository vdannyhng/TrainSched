import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, Screen } from '@/components/ui';
import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';

/** Pausierte Konten sehen nur diesen Hinweis (Daten sind serverseitig per RLS gesperrt). */
export default function PausedScreen() {
  const { t } = useTranslation();
  const { refetchProfile } = useAuth();
  const signOutMutation = useMutation({ mutationFn: signOut });

  return (
    <Screen>
      <EmptyState
        icon="pause-circle-outline"
        title={t('access.pausedScreenTitle')}
        message={t('access.pausedScreenMessage')}
        action={<Button title={t('common.retry')} variant="secondary" onPress={refetchProfile} />}
      />
      <Button
        title={t('auth.signOut')}
        variant="ghost"
        loading={signOutMutation.isPending}
        onPress={() => signOutMutation.mutate()}
      />
    </Screen>
  );
}
