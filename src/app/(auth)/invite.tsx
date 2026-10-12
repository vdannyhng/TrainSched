import { useMutation } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, FormMessage, Screen } from '@/components/ui';
import { acceptInvite } from '@/features/auth/api';
import { InviteForm } from '@/features/auth/components/InviteForm';
import { authErrorKey } from '@/features/auth/errors';
import { spacing } from '@/theme/tokens';

/** Erreichbar per Deep Link `trainsched://invite?code=ABCDEFGH` oder über den Login-Screen. */
export default function InviteScreen() {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const mutation = useMutation({ mutationFn: acceptInvite });

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="title">{t('auth.invite.title')}</AppText>
        <AppText tone="muted">{t('auth.invite.subtitle')}</AppText>
      </View>

      <FormMessage message={mutation.error ? t(authErrorKey(mutation.error)) : undefined} />
      <InviteForm
        initialCode={typeof code === 'string' ? code : undefined}
        onSubmit={(values) => mutation.mutate(values)}
        submitting={mutation.isPending}
      />

      <Link href="/sign-in" style={styles.link}>
        <AppText tone="primary">{t('auth.invite.toSignIn')}</AppText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginTop: spacing.lg, marginBottom: spacing.sm },
  link: { alignSelf: 'center', paddingVertical: spacing.sm, minHeight: 44 },
});
