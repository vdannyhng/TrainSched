/* eslint-disable react-hooks/refs -- liveRef wird nur in Gesten-Callbacks gelesen, die der Gesture Handler außerhalb des Renderns aufruft (Fehlalarm). */
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { DateTime } from 'luxon';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';

import { AppText } from '@/components/ui';
import type { BlockerOccurrence } from '@/features/blockers/api';
import { contrastText, LEVEL_COLORS } from '@/lib/colors';
import { formatTimeRange, formatWeekdayShort, localDate, type LocalDate } from '@/lib/time';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { lessonLabel, type Lesson } from '../api';

const GUTTER = 40;
const FIRST_HOUR = 6;
const LAST_HOUR = 24;
const DAY_HOUR_HEIGHT = 56; // Tagesansicht: feste Höhe, scrollbar
const MIN_WEEK_HOUR_HEIGHT = 18; // Woche: passt sich an, scrollt nur bei sehr wenig Platz
const SNAP_MIN = 15;
const NEW_DURATION_MIN = 60;

export type Slot = { date: LocalDate; time: string };

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
  /** Gedrückt halten + ziehen auf freier Fläche → neuer Slot (wie im iPhone-Kalender) */
  onCreateSlot?: (slot: Slot) => void;
  /** Bereits gewählter Slot bleibt markiert, solange die Auswahl offen ist */
  pendingSlot?: Slot | null;
};

function minutesOf(iso: string, zone: string): number {
  const d = DateTime.fromISO(iso, { zone });
  return d.hour * 60 + d.minute;
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function haptic(kind: 'start' | 'tick') {
  if (Platform.OS === 'web') return;
  const p =
    kind === 'start' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) : Haptics.selectionAsync();
  void Promise.resolve(p).catch(() => undefined);
}

/**
 * Zeitleiste 06–24 Uhr für Tag (scrollbar) oder Woche (passt ohne Scrollen auf den Bildschirm).
 * Abgesagte Termine sind ausgeblendet; Blocker liegen grau hinter den Terminen.
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
  onCreateSlot,
  pendingSlot,
}: Props) {
  // Gesten-Callbacks (vom Gesture Handler außerhalb des Renderns aufgerufen) lesen eine Ref.
  // Der React Compiler kann das nicht unterscheiden → Komponente bewusst ausgenommen.
  'use no memo';
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [bodyHeight, setBodyHeight] = useState(0);
  const [now] = useState(() => new Date().toISOString());
  const [drag, setDrag] = useState<{ day: LocalDate; start: number } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const compact = days.length > 1;
  const visible = lessons.filter((l) => l.status !== 'cancelled');

  // Frühere Termine/Blocker (vor 6 Uhr) erweitern den Bereich nach oben
  const earliest = Math.min(
    FIRST_HOUR * 60,
    ...visible.map((l) => minutesOf(l.start_at, zone)),
    ...blockers.map((b) => minutesOf(b.start_at, zone)),
  );
  const firstHour = Math.floor(earliest / 60);
  const hours = LAST_HOUR - firstHour;
  const hourHeight = compact
    ? bodyHeight
      ? Math.max(MIN_WEEK_HOUR_HEIGHT, (bodyHeight - 8) / hours)
      : 0
    : DAY_HOUR_HEIGHT;
  const totalHeight = hourHeight * hours;
  const labelEvery = hourHeight < 26 ? 2 : 1;

  const yOf = (minutes: number) => ((minutes - firstHour * 60) / 60) * hourHeight;
  const top = (iso: string) => yOf(minutesOf(iso, zone));
  const height = (s: string, e: string) => {
    const end = minutesOf(e, zone) || 24 * 60;
    return Math.max(14, ((end - minutesOf(s, zone)) / 60) * hourHeight - 2);
  };

  // Tagesansicht: zum ersten Eintrag (bzw. zur aktuellen Stunde / 8 Uhr) scrollen
  const dayItems = compact
    ? []
    : [...visible, ...blockers].filter((x) => localDate(x.start_at, zone) === days[0]);
  const focusMinutes =
    dayItems.length > 0
      ? Math.min(...dayItems.map((x) => minutesOf(x.start_at, zone)))
      : days[0] === localDate(now, zone)
        ? minutesOf(now, zone)
        : 8 * 60;
  const initialY = Math.max(0, yOf(focusMinutes) - hourHeight);
  useEffect(() => {
    if (!compact) scrollRef.current?.scrollTo({ y: initialY, animated: false });
  }, [compact, initialY, days]);

  // ---------------------------------------------------------------------------
  // Gedrückt halten + ziehen → neuen Slot wählen (15-Min.-Raster, Haptik)
  // ---------------------------------------------------------------------------
  const startAt = (y: number) => {
    const raw = firstHour * 60 + (y / hourHeight) * 60 - NEW_DURATION_MIN / 2;
    const snapped = Math.round(raw / SNAP_MIN) * SNAP_MIN;
    return Math.max(firstHour * 60, Math.min(LAST_HOUR * 60 - NEW_DURATION_MIN, snapped));
  };
  const overlapsLesson = (day: LocalDate, start: number) =>
    visible.some((l) => {
      if (localDate(l.start_at, zone) !== day) return false;
      const s = minutesOf(l.start_at, zone);
      const e = minutesOf(l.end_at, zone) || 24 * 60;
      return start + SNAP_MIN < e && start + NEW_DURATION_MIN - SNAP_MIN > s;
    });

  // Zieh-Zustand zusätzlich in einer Ref: Gesten-Events können schneller kommen als gerendert wird –
  // so lesen alle Callbacks immer den neuesten Stand. `drag` (State) steuert nur die Anzeige.
  const liveRef = useRef<{ day: LocalDate; start: number } | null>(null);
  const update = (value: { day: LocalDate; start: number } | null) => {
    liveRef.current = value;
    setDrag(value);
  };

  const gestureFor = (day: LocalDate) =>
    Gesture.Pan()
      .withTestId(`timeline-${day}`)
      .enabled(!!onCreateSlot && hourHeight > 0)
      .activateAfterLongPress(300)
      .runOnJS(true)
      .onStart((e) => {
        const start = startAt(e.y);
        if (overlapsLesson(day, start)) return;
        update({ day, start });
        haptic('start');
      })
      .onUpdate((e) => {
        const current = liveRef.current;
        if (!current || current.day !== day) return;
        const start = startAt(e.y);
        if (start === current.start) return;
        update({ day, start });
        haptic('tick');
      })
      .onEnd(() => {
        const current = liveRef.current;
        update(null);
        if (current) onCreateSlot?.({ date: current.day, time: toTime(current.start) });
      })
      .onFinalize(() => {
        if (liveRef.current) update(null);
      });

  const ghostFor = (day: LocalDate): number | null => {
    if (drag?.day === day) return drag.start;
    if (pendingSlot?.date === day) {
      const [h, m] = pendingSlot.time.split(':').map(Number) as [number, number];
      return h * 60 + m;
    }
    return null;
  };

  const grid = (
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

      {days.map((day) => {
        const ghost = ghostFor(day);
        return (
          <GestureDetector key={day} gesture={gestureFor(day)}>
            <View
              style={[styles.column, { borderLeftColor: colors.border }]}
              accessibilityHint={onCreateSlot ? t('calendar.longPressHint') : undefined}
            >
              {Array.from({ length: hours }, (_, i) => (
                <View
                  key={i}
                  pointerEvents="none"
                  style={[styles.hourLine, { top: i * hourHeight, borderTopColor: colors.border }]}
                />
              ))}

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
                      compact && styles.centered,
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
                      style={[styles.small, compact && styles.centerText]}
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
                        compact && styles.centered,
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
                          style={[styles.small, styles.centerText, { color: textColor }]}
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
                                name={lesson.format === 'online' ? 'videocam-outline' : 'location-outline'}
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

              {ghost !== null ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.ghost,
                    compact && styles.centered,
                    {
                      top: yOf(ghost),
                      height: (NEW_DURATION_MIN / 60) * hourHeight - 2,
                      borderColor: colors.primary,
                      backgroundColor: `${colors.primary}33`,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    tone="primary"
                    numberOfLines={2}
                    style={[styles.small, compact && styles.centerText]}
                  >
                    {compact ? toTime(ghost) : `${toTime(ghost)}–${toTime(ghost + NEW_DURATION_MIN)}`}
                  </AppText>
                </View>
              ) : null}

              {day === localDate(now, zone) && minutesOf(now, zone) >= firstHour * 60 ? (
                <View
                  pointerEvents="none"
                  style={[styles.nowLine, { top: top(now), backgroundColor: colors.danger }]}
                />
              ) : null}
            </View>
          </GestureDetector>
        );
      })}
    </View>
  );

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
          <ScrollView
            ref={scrollRef}
            scrollEnabled={!drag && totalHeight > bodyHeight + 1}
            showsVerticalScrollIndicator={!compact}
          >
            {grid}
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
  grid: { flexDirection: 'row', marginTop: 8, marginBottom: 8 },
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
  ghost: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: radius.sm,
    borderWidth: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  small: { fontSize: 11, lineHeight: 13 },
  dayBlock: { gap: 2, paddingHorizontal: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2 },
});
