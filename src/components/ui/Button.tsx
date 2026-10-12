import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
};

export function Button({ title, variant = 'primary', loading = false, disabled, ...rest }: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = !!disabled || loading;
  const filled = variant === 'primary' || variant === 'danger';

  const background: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.surfaceMuted,
    ghost: 'transparent',
    danger: colors.danger,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background[variant], opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1 },
        variant === 'secondary' && { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={filled ? colors.onPrimary : colors.primary} />
      ) : (
        <AppText variant="bodyStrong" tone={filled ? 'onPrimary' : 'primary'} style={styles.label}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textAlign: 'center' },
});
