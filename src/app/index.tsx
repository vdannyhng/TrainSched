import { useMutation } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, ErrorState, LoadingState, Screen } from '@/components/ui';
import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { homeHrefForGate } from '@/features/auth/routing';

/** Einstiegspunkt: leitet je nach Login-Status und Rolle in den passenden Bereich. */
export default function Index() {
  const { t } = useTranslation();
  const { gate, refetchProfile } = useAuth();
  const signOutMutation = useMutation({ mutationFn: signOut });

  if (gate === 'loading') return <LoadingState />;

  if (gate === 'profileError') {
    return (
      <Screen>
        <ErrorState message={t('errors.profileLoad')} onRetry={refetchProfile} />
        <Button
          title={t('auth.signOut')}
          variant="ghost"
          loading={signOutMutation.isPending}
          onPress={() => signOutMutation.mutate()}
        />
      </Screen>
    );
  }

  return <Redirect href={homeHrefForGate[gate]} />;
}
