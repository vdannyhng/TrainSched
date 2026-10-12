import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { MIN_TOUCH, radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.focus : colors.border;

  return (
    <View style={styles.container}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.textMuted}
        style={[
          typography.body,
          styles.input,
          { color: colors.text, backgroundColor: colors.surface, borderColor },
          style,
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  input: {
    minHeight: MIN_TOUCH,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
