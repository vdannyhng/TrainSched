import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, FormMessage, Screen } from '@/components/ui';
import { signIn } from '@/features/auth/api';
import { SignInForm } from '@/features/auth/components/SignInForm';
import { authErrorKey } from '@/features/auth/errors';
import { spacing } from '@/theme/tokens';

export default function SignInScreen() {
  const { t } = useTranslation();
  const mutation = useMutation({ mutationFn: signIn });

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="title">{t('common.appName')}</AppText>
        <AppText tone="muted">{t('auth.signIn.subtitle')}</AppText>
      </View>

      <FormMessage message={mutation.error ? t(authErrorKey(mutation.error)) : undefined} />
      <SignInForm onSubmit={(values) => mutation.mutate(values)} submitting={mutation.isPending} />

      <View style={styles.links}>
        <Link href="/forgot-password" style={styles.link}>
          <AppText tone="primary">{t('auth.signIn.forgotPassword')}</AppText>
        </Link>
        <Link href="/invite" style={styles.link}>
          <AppText tone="primary">{t('auth.signIn.haveInvite')}</AppText>
        </Link>
        <Link href="/privacy" style={styles.link}>
          <AppText tone="muted">{t('privacy.title')}</AppText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginTop: spacing.xl, marginBottom: spacing.md },
  links: { gap: spacing.sm, alignItems: 'center', marginTop: spacing.md },
  link: { paddingVertical: spacing.sm, minHeight: 44 },
});
