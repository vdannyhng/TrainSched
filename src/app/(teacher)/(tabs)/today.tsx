import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBlockerOccurrences, type BlockerOccurrence } from '@/features/blockers/api';
import { useLessonsInRange, type Lesson } from '@/features/lessons/api';
import { LessonCard } from '@/features/lessons/components/LessonCard';
import { useLocale, useViewerZone } from '@/features/lessons/hooks';
import {
  addDays,
  formatDayLong,
  formatTimeRange,
  localDate,
  rangeForDays,
  startOfWeek,
  todayIn,
} from '@/lib/time';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Item =
  | { kind: 'lesson'; at: string; lesson: Lesson }
  | { kind: 'blocker'; at: string; blocker: BlockerOccurrence };

/** Startscreen Lehrer: Heute + Rest der Woche inkl. Blocker, mit Schnellaktionen (Verschieben in ≤ 3 Taps). */
export default function TodayScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuth();
  const zone = useViewerZone();
  const locale = useLocale();
  const today = todayIn(zone);
  const weekEnd = addDays(startOfWeek(today), 7);
  const days = Math.max(1, Math.round((Date.parse(weekEnd) - Date.parse(today)) / 86_400_000));
  const { from, to } = rangeForDays(today, days, zone);
  const query = useLessonsInRange(from, to);
  const blockers = useBlockerOccurrences(session?.user.id, from, to);
  // Zeitpunkt einmal beim Öffnen festhalten (Render muss rein bleiben).
  const [openedAt] = useState(() => Date.now());

  const lessons = query.data ?? [];
  const items: Item[] = [
    ...lessons.map((lesson) => ({ kind: 'lesson' as const, at: lesson.start_at, lesson })),
    ...(blockers.data ?? []).map((blocker) => ({ kind: 'blocker' as const, at: blocker.start_at, blocker })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const todays = items.filter((i) => localDate(i.at, zone) === today);
  const byDay = items
    .filter((i) => localDate(i.at, zone) !== today)
    .reduce<Record<string, Item[]>>((acc, i) => {
      (acc[localDate(i.at, zone)] ??= []).push(i);
      return acc;
    }, {});

  const actions = (lesson: Lesson) => [
    {
      label: t('lessons.actions.reschedule'),
      icon: 'swap-horizontal-outline' as const,
      onPress: () => router.push(`/lesson/${lesson.id}/reschedule`),
    },
    ...(lesson.status === 'scheduled' && Date.parse(lesson.start_at) <= openedAt + 3_600_000
      ? [
          {
            label: t('lessons.actions.markHeld'),
            icon: 'checkmark-done-outline' as const,
            onPress: () => router.push(`/lesson/${lesson.id}/held`),
          },
        ]
      : []),
  ];

  const renderItem = (item: Item) =>
    item.kind === 'lesson' ? (
      <LessonCard key={item.lesson.id} lesson={item.lesson} actions={actions(item.lesson)} />
    ) : (
      <Pressable
        key={`${item.blocker.blocker_id}-${item.at}`}
        accessibilityRole="button"
        accessibilityLabel={`${t('blockers.title')}: ${item.blocker.title}`}
        onPress={() => router.push(`/blocker/${item.blocker.blocker_id}`)}
        style={[styles.blocker, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
      >
        <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
        <AppText tone="muted" variant="label">
          {formatTimeRange(item.blocker.start_at, item.blocker.end_at, zone, locale)}
        </AppText>
        <AppText tone="muted" numberOfLines={1} style={styles.flex}>
          {item.blocker.title}
        </AppText>
      </Pressable>
    );

  const newLesson = () => router.push({ pathname: '/lesson/new', params: { date: today } });

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch();
              void blockers.refetch();
            }}
          />
        }
      >
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <AppText variant="title">{t('lessons.today')}</AppText>
            <AppText tone="muted">{formatDayLong(today, locale)}</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('lessons.new')}
            onPress={newLesson}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={28} color={colors.onPrimary} />
          </Pressable>
        </View>

        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={t('errors.loadFailed')} onRetry={() => void query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={t('lessons.emptyTitle')}
            message={t('lessons.emptyTeacher')}
            action={<Button title={t('lessons.new')} onPress={newLesson} />}
          />
        ) : (
          <>
            {todays.length === 0 ? <AppText tone="muted">{t('lessons.nothingToday')}</AppText> : null}
            {todays.map(renderItem)}

            <AppText variant="heading" style={styles.section}>
              {t('lessons.thisWeek')}
            </AppText>
            {Object.keys(byDay).length === 0 ? (
              <AppText tone="muted">{t('lessons.nothingWeek')}</AppText>
            ) : null}
            {Object.entries(byDay).map(([day, dayItems]) => (
              <View key={day} style={styles.day}>
                <AppText variant="label" tone="muted">
                  {formatDayLong(day, locale)}
                </AppText>
                {dayItems.map(renderItem)}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: spacing.md },
  day: { gap: spacing.sm },
  blocker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
