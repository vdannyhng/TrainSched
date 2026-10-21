import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, FormMessage, Screen } from '@/components/ui';
import { acceptPrivacyPolicy, signOut } from '@/features/auth/api';
import { profileQueryKey, useAuth } from '@/features/auth/AuthProvider';
import { authErrorKey } from '@/features/auth/errors';
import { spacing } from '@/theme/tokens';

const BULLETS = ['data', 'lessons', 'location', 'delete'] as const;

export default function ConsentScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const accept = useMutation({
    mutationFn: acceptPrivacyPolicy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileQueryKey(session?.user.id) }),
  });
  const decline = useMutation({ mutationFn: signOut });

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="title">{t('consent.title')}</AppText>
        <AppText>{t('consent.intro')}</AppText>
      </View>

      <View style={styles.list}>
        {BULLETS.map((key) => (
          <View key={key} style={styles.row}>
            <AppText accessibilityElementsHidden importantForAccessibility="no">
              •
            </AppText>
            <AppText style={styles.flex}>{t(`consent.bullets.${key}`)}</AppText>
          </View>
        ))}
      </View>

      <Button title={t('privacy.read')} variant="ghost" onPress={() => router.push('/privacy')} />

      <FormMessage message={accept.error ? t(authErrorKey(accept.error)) : undefined} />
      <Button title={t('consent.accept')} loading={accept.isPending} onPress={() => accept.mutate()} />
      <Button
        title={t('consent.decline')}
        variant="ghost"
        loading={decline.isPending}
        onPress={() => decline.mutate()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginTop: spacing.lg },
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
