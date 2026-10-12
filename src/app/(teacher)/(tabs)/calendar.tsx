import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Chip, ChipRow, ErrorState, Segmented } from '@/components/ui';
import { useLessonsInRange, type Lesson } from '@/features/lessons/api';
import { LessonCard } from '@/features/lessons/components/LessonCard';
import { MonthGrid } from '@/features/lessons/components/MonthGrid';
import { Timeline } from '@/features/lessons/components/Timeline';
import { useLocale, useViewerZone } from '@/features/lessons/hooks';
import { useTags } from '@/features/tags/api';
import { LEVEL_COLORS, LEVELS, type Level } from '@/lib/colors';
import {
  addDays,
  addMonths,
  daysOf,
  formatDayLong,
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

type View_ = 'day' | 'week' | 'month';

function rangeFor(view: View_, anchor: LocalDate): { start: LocalDate; days: number } {
  if (view === 'day') return { start: anchor, days: 1 };
  if (view === 'week') return { start: startOfWeek(anchor), days: 7 };
  const grid = monthGrid(anchor);
  return { start: grid[0]![0]!.date, days: 42 };
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const zone = useViewerZone();
  const locale = useLocale();
  const today = todayIn(zone);
  const [view, setView] = useState<View_>('week');
  const [anchor, setAnchor] = useState<LocalDate>(today);
  const [level, setLevel] = useState<Level | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const tags = useTags();

  const { start, days } = rangeFor(view, anchor);
  const { from, to } = rangeForDays(start, days, zone);
  const query = useLessonsInRange(from, to);

  const lessons = (query.data ?? []).filter(
    (l) => (!level || l.level === level) && (!tagId || l.tags.some((tag) => tag.id === tagId)),
  );

  const step = (dir: 1 | -1) =>
    setAnchor((a) =>
      view === 'day' ? addDays(a, dir) : view === 'week' ? addDays(a, 7 * dir) : addMonths(a, dir),
    );

  const title =
    view === 'day'
      ? formatDayLong(anchor, locale)
      : view === 'week'
        ? `${formatDayShort(start, locale)} – ${formatDayShort(addDays(start, 6), locale)}`
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
        <View style={styles.titleRow}>
          <AppText variant="title" style={styles.flex}>
            {t('calendar.title')}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('lessons.new')}
            onPress={() => router.push({ pathname: '/lesson/new', params: { date: anchor } })}
            style={[styles.roundButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={28} color={colors.onPrimary} />
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
        <View style={styles.nav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('calendar.previous')}
            onPress={() => step(-1)}
            style={styles.navButton}
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
            style={styles.navButton}
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
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
          <AppText variant="label" tone="muted">
            {t('calendar.lessonsCount', {
              count: lessons.filter((l) => localDate(l.start_at, zone).slice(0, 7) === anchor.slice(0, 7))
                .length,
            })}
          </AppText>
        </ScrollView>
      ) : view === 'day' ? (
        <View style={styles.flex}>
          {lessons.length > 0 && lessons.length <= 6 ? (
            <ScrollView contentContainerStyle={styles.dayList}>
              {lessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </ScrollView>
          ) : (
            <Timeline
              days={[anchor]}
              lessons={lessons}
              zone={zone}
              locale={locale}
              today={today}
              onPressLesson={openLesson}
            />
          )}
        </View>
      ) : (
        <View style={[styles.flex, styles.timelinePad]}>
          <Timeline
            days={daysOf(start, 7)}
            lessons={lessons}
            zone={zone}
            locale={locale}
            today={today}
            onPressLesson={openLesson}
            onPressDay={(date) => {
              setAnchor(date);
              setView('day');
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  roundButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: { flexDirection: 'row', alignItems: 'center' },
  navButton: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center' },
  todayButton: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.sm },
  monthContent: { padding: spacing.lg, gap: spacing.md },
  dayList: { padding: spacing.lg, gap: spacing.sm },
  timelinePad: { paddingHorizontal: spacing.sm },
});
