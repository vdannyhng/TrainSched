import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, FormMessage, LoadingState, Screen } from '@/components/ui';
import { exchangeRecoveryCode, updatePassword } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { NewPasswordForm } from '@/features/auth/components/NewPasswordForm';
import { authErrorKey } from '@/features/auth/errors';
import { spacing } from '@/theme/tokens';

/**
 * Ziel des Links aus der Passwort-Reset-Mail (`trainsched://reset-password?code=…`).
 * Der PKCE-Code wird gegen eine Session getauscht, danach wird das neue Passwort gesetzt.
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { code } = useLocalSearchParams<{ code?: string }>();

  const exchange = useMutation({ mutationFn: exchangeRecoveryCode });
  const update = useMutation({ mutationFn: (password: string) => updatePassword(password) });

  const { mutate: exchangeCode, isIdle: exchangeIdle } = exchange;
  useEffect(() => {
    if (typeof code === 'string' && code && exchangeIdle) exchangeCode(code);
  }, [code, exchangeIdle, exchangeCode]);

  const linkInvalid = exchange.isError || (!code && !session);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="title">{t('auth.reset.title')}</AppText>
        {!linkInvalid && !update.isSuccess ? (
          <AppText tone="muted">{t('auth.reset.subtitle')}</AppText>
        ) : null}
      </View>

      {linkInvalid ? (
        <>
          <FormMessage message={t('auth.reset.invalidLink')} />
          <Button title={t('auth.forgot.toSignIn')} variant="secondary" onPress={() => router.replace('/')} />
        </>
      ) : exchange.isPending || !session ? (
        <LoadingState label={t('auth.reset.verifying')} />
      ) : update.isSuccess ? (
        <>
          <FormMessage tone="success" message={t('auth.reset.success')} />
          <Button title={t('common.back')} onPress={() => router.replace('/')} />
        </>
      ) : (
        <>
          <FormMessage message={update.error ? t(authErrorKey(update.error)) : undefined} />
          <NewPasswordForm onSubmit={(v) => update.mutate(v.password)} submitting={update.isPending} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginTop: spacing.lg, marginBottom: spacing.sm },
});
