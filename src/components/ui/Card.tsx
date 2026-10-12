import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {title || right ? (
        <View style={styles.header}>
          {title ? (
            <AppText variant="bodyStrong" accessibilityRole="header" style={styles.title}>
              {title}
            </AppText>
          ) : null}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.row}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      {typeof value === 'string' ? <AppText>{value}</AppText> : value}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  row: { gap: 2 },
});
