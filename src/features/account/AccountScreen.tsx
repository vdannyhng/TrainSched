import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, FormMessage, Screen } from '@/components/ui';
import { signOut, updateProfileLocale } from '@/features/auth/api';
import { profileQueryKey, useAuth } from '@/features/auth/AuthProvider';
import { authErrorKey } from '@/features/auth/errors';
import { SUPPORTED_LOCALES, type AppLocale } from '@/i18n';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Konto-Screen für alle Rollen: Profilinfos, Sprache, Abmelden. */
export function AccountScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const setLocale = useMutation({
    mutationFn: (locale: AppLocale) => updateProfileLocale(userId!, locale),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) }),
  });
  const signOutMutation = useMutation({ mutationFn: signOut });

  if (!profile) return null;

  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <AppText variant="title">{t('account.title')}</AppText>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Row label={t('account.name')} value={profile.display_name || '–'} />
        <Row label={t('auth.email')} value={profile.email ?? '–'} />
        <Row label={t('account.role')} value={t(`account.roles.${profile.role}`)} />
        <Row label={t('account.timezone')} value={profile.timezone} />
      </View>

      <AppText variant="heading">{t('account.language')}</AppText>
      <View style={styles.segment} accessibilityRole="radiogroup">
        {SUPPORTED_LOCALES.map((locale) => {
          const selected = profile.locale === locale;
          return (
            <Pressable
              key={locale}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: setLocale.isPending }}
              disabled={setLocale.isPending}
              onPress={() => setLocale.mutate(locale)}
              style={[
                styles.segmentItem,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : colors.surface,
                },
              ]}
            >
              <AppText variant="bodyStrong" tone={selected ? 'onPrimary' : 'default'}>
                {t(`account.languages.${locale}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <FormMessage message={setLocale.error ? t(authErrorKey(setLocale.error)) : undefined} />

      <View style={styles.spacer} />
      <Button
        title={t('auth.signOut')}
        variant="secondary"
        loading={signOutMutation.isPending}
        onPress={() => signOutMutation.mutate()}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: { gap: 2 },
  segment: { flexDirection: 'row', gap: spacing.sm },
  segmentItem: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderWidth: 1.5,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  spacer: { flex: 1, minHeight: spacing.lg },
});
