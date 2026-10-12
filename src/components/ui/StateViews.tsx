import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function LoadingState({ label }: { label?: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.center} accessible accessibilityLabel={label ?? t('common.loading')}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function EmptyState({
  icon = 'leaf-outline',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={48} color={colors.textMuted} accessibilityElementsHidden />
      <AppText variant="heading" style={styles.text}>
        {title}
      </AppText>
      {message ? (
        <AppText tone="muted" style={styles.text}>
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.center} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={48} color={colors.danger} accessibilityElementsHidden />
      <AppText style={styles.text}>{message ?? t('errors.generic')}</AppText>
      {onRetry ? <Button title={t('common.retry')} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  text: { textAlign: 'center' },
});
