import Ionicons from '@expo/vector-icons/Ionicons';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { AppText } from '@/components/ui';
import type { BlockerOccurrence } from '@/features/blockers/api';
import { contrastText, LEVEL_COLORS } from '@/lib/colors';
import { formatTimeRange, formatWeekdayShort, localDate, type LocalDate } from '@/lib/time';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { lessonLabel, type Lesson } from '../api';

const GUTTER = 40;
const MIN_HOUR_HEIGHT = 22; // darunter wird gescrollt (z. B. sehr grosse Schrift)
const DEFAULT_FIRST_HOUR = 8;
const DEFAULT_LAST_HOUR = 21;

type Props = {
  days: LocalDate[];
  lessons: Lesson[];
  blockers?: BlockerOccurrence[];
  zone: string;
  locale: string;
  today: LocalDate;
  onPressLesson: (lesson: Lesson) => void;
  onPressBlocker?: (blocker: BlockerOccurrence) => void;
  onPressDay?: (date: LocalDate) => void;
  /** Langes Drücken auf eine freie Stelle → Termin/Blocker anlegen (Zeit auf 30 Min. gerundet) */
  onLongPressSlot?: (date: LocalDate, time: string) => void;
};

function hourOf(iso: string, zone: string): number {
  const d = DateTime.fromISO(iso, { zone });
  return d.hour + d.minute / 60;
}

/**
 * Zeitleiste für Tag (1 Spalte) oder Woche (7 Spalten).
 * Skaliert die Stundenhöhe so, dass der ganze Tag ohne Scrollen sichtbar ist.
 * Abgesagte Termine werden ausgeblendet; Blocker erscheinen grau hinter den Terminen.
 */
export function Timeline({
  days,
  lessons,
  blockers = [],
  zone,
  locale,
  today,
  onPressLesson,
  onPressBlocker,
  onPressDay,
  onLongPressSlot,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [bodyHeight, setBodyHeight] = useState(0);
  const [now] = useState(() => new Date().toISOString());
  const compact = days.length > 1;
  const visible = lessons.filter((l) => l.status !== 'cancelled');

  // Sichtbarer Bereich: 08–21 Uhr, erweitert um alle Termine/Blocker der Ansicht
  const starts = [...visible.map((l) => l.start_at), ...blockers.map((b) => b.start_at)].map((iso) =>
    hourOf(iso, zone),
  );
  const ends = [...visible.map((l) => l.end_at), ...blockers.map((b) => b.end_at)].map(
    (iso) => hourOf(iso, zone) || 24,
  );
  const firstHour = Math.max(0, Math.floor(Math.min(DEFAULT_FIRST_HOUR, ...starts)));
  const lastHour = Math.min(24, Math.ceil(Math.max(DEFAULT_LAST_HOUR, ...ends)));
  const hours = lastHour - firstHour;
  const hourHeight = bodyHeight ? Math.max(MIN_HOUR_HEIGHT, bodyHeight / hours) : 0;
  const totalHeight = hourHeight * hours;
  const labelEvery = hourHeight < 28 ? 2 : 1;

  const top = (iso: string) => (hourOf(iso, zone) - firstHour) * hourHeight;
  const height = (s: string, e: string) =>
    Math.max(14, ((hourOf(e, zone) || 24) - hourOf(s, zone)) * hourHeight - 2);

  const handleLongPress = (day: LocalDate) => (e: GestureResponderEvent) => {
    if (!onLongPressSlot || !hourHeight) return;
    const hour = firstHour + e.nativeEvent.locationY / hourHeight;
    const halfHours = Math.max(0, Math.min(47, Math.floor(hour * 2)));
    const time = `${String(Math.floor(halfHours / 2)).padStart(2, '0')}:${halfHours % 2 ? '30' : '00'}`;
    onLongPressSlot(day, time);
  };

  return (
    <View style={styles.wrapper}>
      {compact ? (
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <View style={{ width: GUTTER }} />
          {days.map((day) => {
            const isToday = day === today;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={DateTime.fromISO(day)
                  .setLocale(locale)
                  .toLocaleString(DateTime.DATE_HUGE)}
                onPress={() => onPressDay?.(day)}
                style={styles.headerCell}
              >
                <AppText variant="caption" tone={isToday ? 'primary' : 'muted'} numberOfLines={1}>
                  {formatWeekdayShort(day, locale)}
                </AppText>
                <View style={[styles.dayNumber, isToday && { backgroundColor: colors.primary }]}>
                  <AppText variant="bodyStrong" tone={isToday ? 'onPrimary' : 'default'}>
                    {Number(day.slice(8))}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.body} onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}>
        {hourHeight ? (
          <ScrollView scrollEnabled={totalHeight > bodyHeight + 1} showsVerticalScrollIndicator={false}>
            <View style={[styles.grid, { height: totalHeight }]}>
              <View style={{ width: GUTTER }}>
                {Array.from({ length: hours }, (_, i) =>
                  i % labelEvery === 0 ? (
                    <AppText
                      key={i}
                      tone="muted"
                      numberOfLines={1}
                      style={[styles.hourLabel, { top: i * hourHeight - 7 }]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {String(firstHour + i).padStart(2, '0')}:00
                    </AppText>
                  ) : null,
                )}
              </View>

              {days.map((day) => (
                <View key={day} style={[styles.column, { borderLeftColor: colors.border }]}>
                  {Array.from({ length: hours }, (_, i) => (
                    <View
                      key={i}
                      style={[styles.hourLine, { top: i * hourHeight, borderTopColor: colors.border }]}
                    />
                  ))}

                  {/* Hintergrund für langes Drücken – Geschwister (nicht Eltern) der Blöcke, damit keine Buttons verschachtelt sind */}
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    onLongPress={handleLongPress(day)}
                    delayLongPress={350}
                    accessibilityLabel={t('calendar.longPressHint')}
                  />

                  {blockers
                    .filter((b) => localDate(b.start_at, zone) === day)
                    .map((b) => (
                      <Pressable
                        key={`${b.blocker_id}-${b.start_at}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('blockers.title')}: ${b.title}, ${formatTimeRange(b.start_at, b.end_at, zone, locale)}`}
                        onPress={() => onPressBlocker?.(b)}
                        style={[
                          styles.blocker,
                          {
                            top: top(b.start_at),
                            height: height(b.start_at, b.end_at),
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          tone="muted"
                          numberOfLines={compact ? 2 : 1}
                          style={styles.small}
                        >
                          {compact
                            ? b.title
                            : `${formatTimeRange(b.start_at, b.end_at, zone, locale)} · ${b.title}`}
                        </AppText>
                      </Pressable>
                    ))}

                  {visible
                    .filter((l) => localDate(l.start_at, zone) === day)
                    .map((lesson) => {
                      const background = lesson.level ? LEVEL_COLORS[lesson.level] : colors.primary;
                      const textColor = contrastText(lesson.level ? LEVEL_COLORS[lesson.level] : '#1F5F8B');
                      const label = lessonLabel(lesson);
                      const h = height(lesson.start_at, lesson.end_at);
                      return (
                        <Pressable
                          key={lesson.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${formatTimeRange(lesson.start_at, lesson.end_at, zone, locale)} ${label}`}
                          onPress={() => onPressLesson(lesson)}
                          style={[
                            styles.block,
                            {
                              top: top(lesson.start_at),
                              height: h,
                              backgroundColor: background,
                              opacity: lesson.status === 'held' ? 0.6 : 1,
                            },
                          ]}
                        >
                          {compact ? (
                            <AppText
                              numberOfLines={Math.max(1, Math.floor(h / 13))}
                              style={[styles.small, { color: textColor }]}
                            >
                              {label}
                            </AppText>
                          ) : (
                            <View style={styles.dayBlock}>
                              <AppText variant="label" numberOfLines={1} style={{ color: textColor }}>
                                {formatTimeRange(lesson.start_at, lesson.end_at, zone, locale)} · {label}
                              </AppText>
                              {h > 36 ? (
                                <View style={styles.row}>
                                  <Ionicons
                                    name={
                                      lesson.format === 'online' ? 'videocam-outline' : 'location-outline'
                                    }
                                    size={12}
                                    color={textColor}
                                  />
                                  <AppText variant="caption" numberOfLines={1} style={{ color: textColor }}>
                                    {lesson.format === 'online'
                                      ? t('lessons.format.online')
                                      : (lesson.location ?? t('lessons.format.in_person'))}
                                  </AppText>
                                </View>
                              ) : null}
                            </View>
                          )}
                        </Pressable>
                      );
                    })}

                  {day === localDate(now, zone) &&
                  hourOf(now, zone) >= firstHour &&
                  hourOf(now, zone) <= lastHour ? (
                    <View
                      pointerEvents="none"
                      style={[styles.nowLine, { top: top(now), backgroundColor: colors.danger }]}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  headerRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 2 },
  headerCell: { flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  dayNumber: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  grid: { flexDirection: 'row', marginTop: 8 },
  hourLabel: {
    position: 'absolute',
    left: 0,
    width: GUTTER - 6,
    textAlign: 'right',
    fontSize: 11,
    lineHeight: 14,
  },
  column: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth },
  hourLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth },
  blocker: {
    position: 'absolute',
    left: 1,
    right: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 3,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  block: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: radius.sm,
    paddingHorizontal: 3,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  small: { fontSize: 11, lineHeight: 13 },
  dayBlock: { gap: 2, paddingHorizontal: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2 },
});
