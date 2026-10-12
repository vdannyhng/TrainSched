import { Pressable, StyleSheet, View } from 'react-native';

import { contrastText } from '@/lib/colors';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

type Props = {
  label: string;
  /** Füllfarbe (#RRGGBB). Ohne Farbe wird ein neutraler Chip gezeichnet. */
  color?: string;
  /** Für Filter-Chips: nicht ausgewählt → nur Umrandung. */
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Farbiger Chip für Level/Themen; Textfarbe wird automatisch kontrastreich gewählt. */
export function Chip({ label, color, selected = true, onPress, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const fill = color ?? colors.primary;
  const filled = selected;

  const content = (
    <AppText variant="label" numberOfLines={1} style={{ color: filled ? contrastText(fill) : colors.text }}>
      {label}
    </AppText>
  );

  const style = [
    styles.chip,
    filled
      ? { backgroundColor: fill, borderColor: fill }
      : { backgroundColor: colors.surface, borderColor: color ?? colors.border },
  ];

  if (!onPress) {
    return (
      <View style={style} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={6}
      style={({ pressed }) => [...style, styles.pressable, pressed && { opacity: 0.8 }]}
    >
      {content}
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    maxWidth: 220,
  },
  pressable: { minHeight: 36, justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
