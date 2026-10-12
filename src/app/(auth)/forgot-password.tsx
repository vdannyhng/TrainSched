import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, FormMessage, FormTextField, Screen } from '@/components/ui';
import { requestPasswordReset } from '@/features/auth/api';
import { authErrorKey } from '@/features/auth/errors';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';
import { spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const mutation = useMutation({ mutationFn: (v: ForgotPasswordValues) => requestPasswordReset(v.email) });
  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="title">{t('auth.forgot.title')}</AppText>
        <AppText tone="muted">{t('auth.forgot.subtitle')}</AppText>
      </View>

      {mutation.isSuccess ? (
        <FormMessage tone="success" message={t('auth.forgot.sent')} />
      ) : (
        <>
          <FormMessage message={mutation.error ? t(authErrorKey(mutation.error)) : undefined} />
          <FormTextField
            control={control}
            name="email"
            label={t('auth.email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Button
            title={t('auth.forgot.submit')}
            loading={mutation.isPending}
            onPress={handleSubmit((v) => mutation.mutate(v))}
          />
        </>
      )}

      <Link href="/sign-in" style={styles.link}>
        <AppText tone="primary">{t('auth.forgot.toSignIn')}</AppText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginTop: spacing.lg, marginBottom: spacing.sm },
  link: { alignSelf: 'center', paddingVertical: spacing.sm, minHeight: 44 },
});
