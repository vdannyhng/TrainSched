import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Chip, ChipRow, ErrorState, Segmented } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBlockerOccurrences } from '@/features/blockers/api';
import { useLessonsInRange, type Lesson } from '@/features/lessons/api';
import { MonthGrid } from '@/features/lessons/components/MonthGrid';
import { SlotActionSheet } from '@/features/lessons/components/SlotActionSheet';
import { Timeline, type Slot } from '@/features/lessons/components/Timeline';
import { useLocale, useViewerZone } from '@/features/lessons/hooks';
import { useTags } from '@/features/tags/api';
import { LEVEL_COLORS, LEVELS, type Level } from '@/lib/colors';
import {
  addDays,
  addMonths,
  daysOf,
  formatDayMonth,
  formatDayShort,
  formatMonth,
  localDate,
  monthGrid,
  rangeForDays,
  startOfWeek,
  todayIn,
  type LocalDate,
} from '@/lib/time';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type CalendarView = 'day' | 'week' | 'month';

function rangeFor(view: CalendarView, anchor: LocalDate): { start: LocalDate; days: number } {
  if (view === 'day') return { start: anchor, days: 1 };
  if (view === 'week') return { start: startOfWeek(anchor), days: 7 };
  return { start: monthGrid(anchor)[0]![0]!.date, days: 42 };
}

/**
 * Kalender: Tag und Woche als Zeitleiste (passt ohne Scrollen auf den Bildschirm),
 * Monat als Raster. Langes Drücken auf eine freie Stelle → Termin oder Blocker anlegen.
 */
export default function CalendarScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuth();
  const zone = useViewerZone();
  const locale = useLocale();
  const today = todayIn(zone);
  const [view, setView] = useState<CalendarView>('week');
  const [anchor, setAnchor] = useState<LocalDate>(today);
  const [level, setLevel] = useState<Level | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const tags = useTags(session?.user.id);

  const { start, days } = rangeFor(view, anchor);
  const { from, to } = rangeForDays(start, days, zone);
  const query = useLessonsInRange(from, to);
  const blockers = useBlockerOccurrences(session?.user.id, from, to);

  const filtersActive = level !== null || tagId !== null;
  const lessons = (query.data ?? []).filter(
    (l) => (!level || l.level === level) && (!tagId || l.tags.some((tag) => tag.id === tagId)),
  );

  const step = (dir: 1 | -1) =>
    setAnchor((a) =>
      view === 'day' ? addDays(a, dir) : view === 'week' ? addDays(a, 7 * dir) : addMonths(a, dir),
    );

  // Kurze Titel, damit sie neben den Knöpfen nicht abgeschnitten werden
  const title =
    view === 'day'
      ? formatDayShort(anchor, locale)
      : view === 'week'
        ? `${formatDayMonth(start, locale)} – ${formatDayMonth(addDays(start, 6), locale)}`
        : formatMonth(anchor, locale);

  const openLesson = (lesson: Lesson) => router.push(`/lesson/${lesson.id}`);
  const counts = lessons
    .filter((l) => l.status !== 'cancelled')
    .reduce<Record<string, number>>((acc, l) => {
      const d = localDate(l.start_at, zone);
      acc[d] = (acc[d] ?? 0) + 1;
      return acc;
    }, {});

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View style={styles.nav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('calendar.previous')}
            onPress={() => step(-1)}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <AppText variant="bodyStrong" style={styles.navTitle} numberOfLines={1}>
            {title}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('calendar.next')}
            onPress={() => step(1)}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </Pressable>
          {anchor !== today ? (
            <Pressable accessibilityRole="button" onPress={() => setAnchor(today)} style={styles.todayButton}>
              <AppText tone="primary" variant="label">
                {t('calendar.today')}
              </AppText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('blockers.new')}
            onPress={() => router.push({ pathname: '/blocker/new', params: { date: anchor } })}
            style={styles.iconButton}
          >
            <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('lessons.new')}
            onPress={() => router.push({ pathname: '/lesson/new', params: { date: anchor } })}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={26} color={colors.onPrimary} />
          </Pressable>
        </View>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'day', label: t('calendar.day') },
            { value: 'week', label: t('calendar.week') },
            { value: 'month', label: t('calendar.month') },
          ]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <ChipRow>
            {LEVELS.map((l) => (
              <Chip
                key={l}
                label={l}
                color={LEVEL_COLORS[l]}
                selected={level === l}
                onPress={() => setLevel(level === l ? null : l)}
              />
            ))}
            {tags.data?.map((tag) => (
              <Chip
                key={tag.id}
                label={tag.label}
                color={tag.color}
                selected={tagId === tag.id}
                onPress={() => setTagId(tagId === tag.id ? null : tag.id)}
              />
            ))}
          </ChipRow>
        </ScrollView>
      </View>

      {query.isError ? (
        <ErrorState message={t('errors.loadFailed')} onRetry={() => void query.refetch()} />
      ) : view === 'month' ? (
        <ScrollView contentContainerStyle={styles.monthContent}>
          <MonthGrid
            month={anchor}
            today={today}
            locale={locale}
            counts={counts}
            onSelect={(date) => {
              setAnchor(date);
              setView('day');
            }}
          />
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.timeline]}>
          <Timeline
            days={view === 'day' ? [anchor] : daysOf(start, 7)}
            lessons={lessons}
            blockers={filtersActive ? [] : (blockers.data ?? [])}
            zone={zone}
            locale={locale}
            today={today}
            onPressLesson={openLesson}
            onPressBlocker={(b) => router.push(`/blocker/${b.blocker_id}`)}
            onPressDay={(date) => {
              setAnchor(date);
              setView('day');
            }}
            onCreateSlot={setSlot}
            pendingSlot={slot}
          />
          <AppText variant="caption" tone="muted" style={styles.hint}>
            {Platform.OS === 'web' ? t('calendar.mouseHint') : t('calendar.longPressHint')}
          </AppText>
        </View>
      )}

      <SlotActionSheet
        slot={slot}
        locale={locale}
        onClose={() => setSlot(null)}
        onLesson={() => {
          const s = slot!;
          setSlot(null);
          router.push({
            pathname: '/lesson/new',
            params: { date: s.date, time: s.time, duration: String(s.durationMin ?? 60) },
          });
        }}
        onBlocker={() => {
          const s = slot!;
          setSlot(null);
          router.push({
            pathname: '/blocker/new',
            params: { date: s.date, time: s.time, duration: String(s.durationMin ?? 60) },
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  nav: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: MIN_TOUCH - 4, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  navTitle: { flex: 1, textAlign: 'center' },
  todayButton: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.xs },
  chips: { paddingBottom: spacing.xs },
  monthContent: { padding: spacing.md, gap: spacing.md },
  timeline: { paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  hint: { textAlign: 'center', paddingTop: 2 },
});
