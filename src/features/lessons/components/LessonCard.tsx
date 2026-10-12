import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Chip, ChipRow } from '@/components/ui';
import { LEVEL_COLORS } from '@/lib/colors';
import { formatTimeRange, otherZoneTime } from '@/lib/time';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { lessonLabel, type Lesson } from '../api';
import { useLocale, useViewerZone } from '../hooks';

type Action = { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void };

type Props = {
  lesson: Lesson;
  /** Präfix der Detailroute: Lehrer '/lesson/', Schüler '/my-lesson/' */
  hrefBase?: '/lesson/' | '/my-lesson/';
  showDate?: string;
  actions?: Action[];
};

export function LessonCard({ lesson, hrefBase = '/lesson/', showDate, actions }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const zone = useViewerZone();
  const locale = useLocale();
  const cancelled = lesson.status === 'cancelled';
  const label = lessonLabel(lesson, hrefBase === '/my-lesson/' ? t('lessons.defaultLabel') : undefined);

  // Zweite Uhrzeit: Zeitzone der (ersten abweichenden) Teilnehmenden bzw. des Termins
  const otherZone =
    lesson.participants.map((p) => p.student?.timezone).find((z) => z && z !== zone) ??
    (lesson.timezone !== zone ? lesson.timezone : undefined);
  const second = otherZone ? otherZoneTime(lesson.start_at, zone, otherZone, locale) : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: cancelled ? 0.7 : 1 },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${formatTimeRange(lesson.start_at, lesson.end_at, zone, locale)}, ${label}${
          cancelled ? `, ${t('lessons.status.cancelled')}` : ''
        }`}
        onPress={() => router.push(`${hrefBase}${lesson.id}`)}
        style={styles.main}
      >
        <View
          style={[
            styles.stripe,
            { backgroundColor: lesson.level ? LEVEL_COLORS[lesson.level] : colors.primary },
          ]}
        />
        <View style={styles.body}>
          <View style={styles.row}>
            <AppText variant="bodyStrong" style={cancelled && styles.strike}>
              {showDate ? `${showDate} · ` : ''}
              {formatTimeRange(lesson.start_at, lesson.end_at, zone, locale)}
            </AppText>
            <Ionicons
              name={lesson.format === 'online' ? 'videocam-outline' : 'location-outline'}
              size={16}
              color={colors.textMuted}
              accessibilityElementsHidden
            />
            {lesson.status !== 'scheduled' ? (
              <AppText variant="caption" tone={cancelled ? 'danger' : 'success'}>
                {t(`lessons.status.${lesson.status}`)}
              </AppText>
            ) : null}
          </View>
          {second ? (
            <AppText variant="caption" tone="muted">
              {second}
            </AppText>
          ) : null}
          <AppText numberOfLines={1} style={cancelled && styles.strike}>
            {label}
          </AppText>
          {lesson.level || lesson.tags.length ? (
            <ChipRow>
              {lesson.level ? <Chip label={lesson.level} color={LEVEL_COLORS[lesson.level]} /> : null}
              {lesson.tags.map((tag) => (
                <Chip key={tag.id} label={tag.label} color={tag.color} />
              ))}
            </ChipRow>
          ) : null}
        </View>
      </Pressable>

      {actions?.length && !cancelled ? (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={`${action.label}: ${label}`}
              onPress={action.onPress}
              style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.surfaceMuted }]}
            >
              <Ionicons name={action.icon} size={18} color={colors.primary} />
              <AppText variant="label" tone="primary">
                {action.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, overflow: 'hidden' },
  main: { flexDirection: 'row', minHeight: MIN_TOUCH + 16 },
  stripe: { width: 5 },
  body: { flex: 1, padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  strike: { textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  action: {
    flex: 1,
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
