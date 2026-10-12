import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

/** Hinweis-/Fehlerbox über oder unter Formularen; wird von Screenreadern angesagt. */
export function FormMessage({ message, tone = 'danger' }: { message?: string; tone?: 'danger' | 'success' }) {
  const { colors } = useTheme();
  if (!message) return null;
  const color = tone === 'danger' ? colors.danger : colors.success;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[styles.box, { borderColor: color, backgroundColor: colors.surface }]}
    >
      <AppText tone={tone}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md },
});
