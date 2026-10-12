import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Chip, ChipRow } from '@/components/ui';
import { LEVEL_COLORS } from '@/lib/colors';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import type { StudentListItem as Item } from '../api';

const MAX_TAGS = 3;

export function StudentListItem({ student }: { student: Item }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const name = [student.first_name, student.last_name].filter(Boolean).join(' ');

  return (
    <Pressable
      onPress={() => router.push(`/student/${student.id}`)}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
            {name}
          </AppText>
          {student.current_level ? (
            <Chip label={student.current_level} color={LEVEL_COLORS[student.current_level]} />
          ) : null}
        </View>
        <View style={styles.meta}>
          {student.status !== 'active' ? (
            <AppText variant="caption" tone="muted">
              {t(`status.${student.status}`)}
            </AppText>
          ) : null}
          {!student.profile_id ? (
            <AppText variant="caption" tone="muted">
              {t('students.noAppAccess')}
            </AppText>
          ) : null}
        </View>
        {student.tags.length ? (
          <ChipRow>
            {student.tags.slice(0, MAX_TAGS).map((tag) => (
              <Chip key={tag.id} label={tag.label} color={tag.color} />
            ))}
            {student.tags.length > MAX_TAGS ? (
              <AppText variant="caption" tone="muted" style={styles.more}>
                +{student.tags.length - MAX_TAGS}
              </AppText>
            ) : null}
          </ChipRow>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} accessibilityElementsHidden />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH + 16,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1 },
  meta: { flexDirection: 'row', gap: spacing.md },
  more: { alignSelf: 'center' },
});
