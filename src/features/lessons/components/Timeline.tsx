import { DateTime } from 'luxon';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { contrastText, LEVEL_COLORS } from '@/lib/colors';
import { formatDayShort, formatTime, localDate, type LocalDate } from '@/lib/time';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { lessonLabel, type Lesson } from '../api';

const HOUR_HEIGHT = 56;
const GUTTER = 52;

type Props = {
  days: LocalDate[];
  lessons: Lesson[];
  zone: string;
  locale: string;
  today: LocalDate;
  onPressLesson: (lesson: Lesson) => void;
  onPressDay?: (date: LocalDate) => void;
};

/** Zeitleiste für Tag (1 Spalte) oder Woche (7 Spalten). Abgesagte Termine werden ausgeblendet. */
export function Timeline({ days, lessons, zone, locale, today, onPressLesson, onPressDay }: Props) {
  const { colors } = useTheme();
  const visible = lessons.filter((l) => l.status !== 'cancelled');

  // Stundenbereich: 7–21 Uhr, bei Bedarf erweitert
  const hours = visible.flatMap((l) => {
    const s = DateTime.fromISO(l.start_at, { zone });
    const e = DateTime.fromISO(l.end_at, { zone });
    return [s.hour, e.hour + (e.minute > 0 ? 1 : 0)];
  });
  const startHour = Math.min(7, ...hours);
  const endHour = Math.max(21, ...hours);
  const height = (endHour - startHour) * HOUR_HEIGHT;
  const compact = days.length > 1;

  // Beim Öffnen zum ersten Termin (bzw. 8 Uhr) scrollen – Unterricht liegt oft abends.
  const scrollRef = useRef<ScrollView>(null);
  const firstStart = visible.reduce<number | null>((min, l) => {
    const s = DateTime.fromISO(l.start_at, { zone });
    const h = s.hour + s.minute / 60;
    return min === null || h < min ? h : min;
  }, null);
  const initialY = Math.max(0, ((firstStart ?? 8) - startHour - 0.5) * HOUR_HEIGHT);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: initialY, animated: false });
  }, [initialY]);

  return (
    <View style={styles.wrapper}>
      {compact ? (
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <View style={{ width: GUTTER }} />
          {days.map((day) => (
            <Pressable
              key={day}
              accessibilityRole="button"
              onPress={() => onPressDay?.(day)}
              style={styles.headerCell}
            >
              <AppText
                variant="caption"
                tone={day === today ? 'primary' : 'muted'}
                numberOfLines={2}
                style={styles.center}
              >
                {formatDayShort(day, locale)}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: spacing.lg }}>
        <View style={[styles.body, { height }]}>
          <View style={{ width: GUTTER }}>
            {Array.from({ length: endHour - startHour }, (_, i) => (
              <AppText
                key={i}
                variant="caption"
                tone="muted"
                style={[styles.hourLabel, { top: i * HOUR_HEIGHT - 8 }]}
                numberOfLines={1}
                accessibilityElementsHidden
              >
                {String(startHour + i).padStart(2, '0')}:00
              </AppText>
            ))}
          </View>
          {days.map((day) => (
            <View key={day} style={[styles.column, { borderLeftColor: colors.border }]}>
              {Array.from({ length: endHour - startHour }, (_, i) => (
                <View
                  key={i}
                  style={[styles.hourLine, { top: i * HOUR_HEIGHT, borderTopColor: colors.border }]}
                />
              ))}
              {visible
                .filter((l) => localDate(l.start_at, zone) === day)
                .map((lesson) => {
                  const s = DateTime.fromISO(lesson.start_at, { zone });
                  const e = DateTime.fromISO(lesson.end_at, { zone });
                  const top = (s.hour + s.minute / 60 - startHour) * HOUR_HEIGHT;
                  const blockHeight = Math.max(24, e.diff(s, 'hours').hours * HOUR_HEIGHT - 2);
                  const color = lesson.level ? LEVEL_COLORS[lesson.level] : colors.primary;
                  const textColor = contrastText(lesson.level ? LEVEL_COLORS[lesson.level] : '#1F5F8B');
                  const label = lessonLabel(lesson);
                  return (
                    <Pressable
                      key={lesson.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatTime(lesson.start_at, zone, locale)} ${label}`}
                      onPress={() => onPressLesson(lesson)}
                      style={[
                        styles.block,
                        {
                          top,
                          height: blockHeight,
                          backgroundColor: color,
                          opacity: lesson.status === 'held' ? 0.65 : 1,
                        },
                      ]}
                    >
                      <AppText variant="caption" numberOfLines={compact ? 3 : 2} style={{ color: textColor }}>
                        {compact ? label : `${formatTime(lesson.start_at, zone, locale)} ${label}`}
                      </AppText>
                    </Pressable>
                  );
                })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  headerRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: spacing.xs },
  headerCell: { flex: 1, minHeight: 44, justifyContent: 'center' },
  center: { textAlign: 'center' },
  body: { flexDirection: 'row', marginTop: spacing.sm },
  hourLabel: { position: 'absolute', left: 0, width: GUTTER - 6, textAlign: 'right' },
  column: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth },
  hourLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth },
  block: { position: 'absolute', left: 2, right: 2, borderRadius: radius.sm, padding: 4, overflow: 'hidden' },
});
