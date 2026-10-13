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
import {
  centeredStart,
  clickStart,
  DEFAULT_DURATION_MIN,
  dragRange,
  minutesAtY,
  toTime,
} from './timelineMath';

const GUTTER = 40;
const FIRST_HOUR = 6;
const LAST_HOUR = 24;
const DAY_HOUR_HEIGHT = 56; // Tagesansicht: feste Höhe, scrollbar
const MIN_WEEK_HOUR_HEIGHT = 18; // Woche: passt sich an, scrollt nur bei sehr wenig Platz

/** Gewählter Slot; durationMin nur beim Ziehen mit der Maus (PC), sonst 60 Min. */
export type Slot = { date: LocalDate; time: string; durationMin?: number };

const IS_WEB = Platform.OS === 'web';

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
  /** Eingabeart: Handy = gedrückt halten + ziehen, PC = klicken / mit der Maus ziehen (Standard: nach Plattform) */
  pointer?: 'touch' | 'mouse';
};

function minutesOf(iso: string, zone: string): number {
  const d = DateTime.fromISO(iso, { zone });
  return d.hour * 60 + d.minute;
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
  pointer = IS_WEB ? 'mouse' : 'touch',
}: Props) {
  // Gesten-Callbacks (vom Gesture Handler außerhalb des Renderns aufgerufen) lesen eine Ref.
  // Der React Compiler kann das nicht unterscheiden → Komponente bewusst ausgenommen.
  'use no memo';
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [bodyHeight, setBodyHeight] = useState(0);
  const [now] = useState(() => new Date().toISOString());
  const [drag, setDrag] = useState<{ day: LocalDate; start: number; end: number; anchor: number } | null>(
    null,
  );
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
  // Neuen Slot wählen
  //   Handy: gedrückt halten (0,3 s) + ziehen – 60-Min.-Block folgt dem Finger, Haptik.
  //   PC:    klicken → 60 Min. ab der halben Stunde; mit der Maus ziehen → Zeitraum wählen.
  // ---------------------------------------------------------------------------
  type DragState = { day: LocalDate; start: number; end: number; anchor: number };
  const at = (y: number) => minutesAtY(y, firstHour, hourHeight);

  const itemAt = (day: LocalDate, minutes: number, includeBlockers: boolean) =>
    [...visible, ...(includeBlockers ? blockers : [])].some((x) => {
      if (localDate(x.start_at, zone) !== day) return false;
      const s0 = minutesOf(x.start_at, zone);
      const e0 = minutesOf(x.end_at, zone) || 24 * 60;
      return minutes >= s0 && minutes < e0;
    });

  // Zieh-Zustand zusätzlich in einer Ref: Gesten-Events können schneller kommen als gerendert wird –
  // so lesen alle Callbacks immer den neuesten Stand. `drag` (State) steuert nur die Anzeige.
  const liveRef = useRef<DragState | null>(null);
  const anchorRef = useRef<number | null>(null);
  const update = (value: DragState | null) => {
    liveRef.current = value;
    setDrag(value);
  };
  const finish = () => {
    const current = liveRef.current;
    update(null);
    if (current) {
      onCreateSlot?.({
        date: current.day,
        time: toTime(current.start),
        durationMin: current.end - current.start,
      });
    }
  };

  const enabled = !!onCreateSlot && hourHeight > 0;

  const touchGesture = (day: LocalDate) =>
    Gesture.Pan()
      .withTestId(`timeline-${day}`)
      .enabled(enabled)
      .activateAfterLongPress(300)
      .runOnJS(true)
      .onStart((e) => {
        const start = centeredStart(at(e.y), firstHour);
        if (itemAt(day, start + DEFAULT_DURATION_MIN / 2, false)) return;
        update({ day, start, end: start + DEFAULT_DURATION_MIN, anchor: start });
        haptic('start');
      })
      .onUpdate((e) => {
        const current = liveRef.current;
        if (!current || current.day !== day) return;
        const start = centeredStart(at(e.y), firstHour);
        if (start === current.start) return;
        update({ ...current, start, end: start + DEFAULT_DURATION_MIN });
        haptic('tick');
      })
      .onEnd(finish)
      .onFinalize(() => {
        if (liveRef.current) update(null);
      });

  const mouseGesture = (day: LocalDate) => {
    const drag = Gesture.Pan()
      .withTestId(`timeline-mouse-${day}`)
      .enabled(enabled)
      .minDistance(4)
      .runOnJS(true)
      // Startpunkt beim Drücken der Maustaste merken (beim Aktivieren ist die Maus schon weiter)
      .onBegin((e) => {
        anchorRef.current = at(e.y);
      })
      .onStart((e) => {
        const anchor = anchorRef.current ?? at(e.y);
        if (itemAt(day, anchor, false)) return;
        update({ day, anchor, ...dragRange(anchor, at(e.y), firstHour) });
      })
      .onUpdate((e) => {
        const current = liveRef.current;
        if (!current || current.day !== day) return;
        const range = dragRange(current.anchor, at(e.y), firstHour);
        if (range.start !== current.start || range.end !== current.end) update({ ...current, ...range });
      })
      .onEnd(finish)
      .onFinalize(() => {
        if (liveRef.current) update(null);
      });
    const click = Gesture.Tap()
      .withTestId(`timeline-click-${day}`)
      .enabled(enabled)
      .runOnJS(true)
      .onEnd((e, success) => {
        const minutes = at(e.y);
        // Klicks auf Termine/Blocker öffnen diese – hier nichts anlegen
        if (!success || itemAt(day, minutes, true)) return;
        const start = clickStart(minutes, firstHour);
        onCreateSlot?.({ date: day, time: toTime(start), durationMin: DEFAULT_DURATION_MIN });
      });
    return Gesture.Exclusive(drag, click);
  };

  const gestureFor = (day: LocalDate) => (pointer === 'mouse' ? mouseGesture(day) : touchGesture(day));

  const ghostFor = (day: LocalDate): { start: number; end: number } | null => {
    if (drag?.day === day) return { start: drag.start, end: drag.end };
    if (pendingSlot?.date === day) {
      const [h, m] = pendingSlot.time.split(':').map(Number) as [number, number];
      const start = h * 60 + m;
      return { start, end: start + (pendingSlot.durationMin ?? DEFAULT_DURATION_MIN) };
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
              style={[
                styles.column,
                pointer === 'mouse' && styles.noSelect,
                { borderLeftColor: colors.border },
              ]}
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
                      top: yOf(ghost.start),
                      height: ((ghost.end - ghost.start) / 60) * hourHeight - 2,
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
                    {compact ? toTime(ghost.start) : `${toTime(ghost.start)}–${toTime(ghost.end)}`}
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
  // Web: beim Ziehen mit der Maus keinen Text markieren
  noSelect: { userSelect: 'none', cursor: 'pointer' } as object,
});
