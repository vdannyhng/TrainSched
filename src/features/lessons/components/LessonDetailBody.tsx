import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Chip, ChipRow, InfoRow } from '@/components/ui';
import { LEVEL_COLORS } from '@/lib/colors';
import { formatDayLong, formatTimeRange, localDate, otherZoneTime } from '@/lib/time';
import { MIN_TOUCH, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { lessonLabel, type Lesson } from '../api';
import { useLocale, useViewerZone } from '../hooks';

/** Gemeinsame Detailanzeige für Lehrer und Schüler. */
export function LessonDetailBody({ lesson, showAttendance }: { lesson: Lesson; showAttendance: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const zone = useViewerZone();
  const locale = useLocale();
  const cancelled = lesson.status === 'cancelled';

  const otherZones = Array.from(
    new Set([
      lesson.timezone,
      ...lesson.participants.map((p) => p.student?.timezone).filter(Boolean),
    ] as string[]),
  ).filter((z) => z !== zone);
  const otherTimes = otherZones.map((z) => otherZoneTime(lesson.start_at, zone, z, locale)).filter(Boolean);

  return (
    <>
      <View style={styles.hero}>
        <AppText variant="title" style={cancelled && styles.strike}>
          {lessonLabel(lesson, showAttendance ? undefined : t('lessons.defaultLabel'))}
        </AppText>
        <ChipRow>
          <Chip
            label={t(`lessons.status.${lesson.status}`)}
            selected={false}
            color={cancelled ? colors.danger : undefined}
          />
          {lesson.level ? <Chip label={lesson.level} color={LEVEL_COLORS[lesson.level]} /> : null}
          {lesson.tags.map((tag) => (
            <Chip key={tag.id} label={tag.label} color={tag.color} />
          ))}
        </ChipRow>
      </View>

      <Card>
        <InfoRow
          label={t('lessons.detail.when')}
          value={
            <View>
              <AppText variant="bodyStrong">
                {formatDayLong(localDate(lesson.start_at, zone), locale)}
              </AppText>
              <AppText>{formatTimeRange(lesson.start_at, lesson.end_at, zone, locale)}</AppText>
              {otherTimes.map((time) => (
                <AppText key={time} tone="muted">
                  {time}
                </AppText>
              ))}
            </View>
          }
        />
        <InfoRow
          label={t('lessons.detail.where')}
          value={
            lesson.format === 'online' ? (
              lesson.meeting_url ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(lesson.meeting_url!).catch(() => undefined)}
                  style={styles.link}
                >
                  <Ionicons name="videocam-outline" size={20} color={colors.primary} />
                  <AppText tone="primary">{t('lessons.actions.join')}</AppText>
                </Pressable>
              ) : (
                t('lessons.format.online')
              )
            ) : (
              lesson.location || t('lessons.format.in_person')
            )
          }
        />
        {cancelled && lesson.cancel_reason ? (
          <InfoRow label={t('lessons.detail.cancelReason')} value={lesson.cancel_reason} />
        ) : null}
      </Card>

      <Card title={t('lessons.detail.participants')}>
        {lesson.participants.map((p) => (
          <View key={p.student_id} style={styles.participant}>
            <AppText style={styles.flex}>
              {[p.student?.first_name, p.student?.last_name].filter(Boolean).join(' ')}
            </AppText>
            {showAttendance && lesson.status === 'held' ? (
              <AppText variant="caption" tone={p.attendance === 'present' ? 'success' : 'muted'}>
                {t(`lessons.attendance.${p.attendance}`)}
              </AppText>
            ) : null}
          </View>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm },
  strike: { textDecorationLine: 'line-through' },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: MIN_TOUCH },
  participant: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  flex: { flex: 1 },
});
