import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useLessonsInRange, type Lesson } from '@/features/lessons/api';
import { LessonCard } from '@/features/lessons/components/LessonCard';
import { useLocale, useViewerZone } from '@/features/lessons/hooks';
import { addDays, formatDayLong, localDate, rangeForDays, startOfWeek, todayIn } from '@/lib/time';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Startscreen Lehrer: Heute + Rest der Woche, mit Schnellaktionen (Verschieben in ≤ 3 Taps). */
export default function TodayScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const zone = useViewerZone();
  const locale = useLocale();
  const today = todayIn(zone);
  const weekEnd = addDays(startOfWeek(today), 7);
  const days = Math.max(1, Math.round((Date.parse(weekEnd) - Date.parse(today)) / 86_400_000));
  const { from, to } = rangeForDays(today, days, zone);
  const query = useLessonsInRange(from, to);
  // Zeitpunkt einmal beim Öffnen festhalten (Render muss rein bleiben).
  const [openedAt] = useState(() => Date.now());

  const lessons = query.data ?? [];
  const todays = lessons.filter((l) => localDate(l.start_at, zone) === today);
  const later = lessons.filter((l) => localDate(l.start_at, zone) !== today);
  const byDay = later.reduce<Record<string, Lesson[]>>((acc, l) => {
    const d = localDate(l.start_at, zone);
    (acc[d] ??= []).push(l);
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

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
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
            onPress={() => router.push({ pathname: '/lesson/new', params: { date: today } })}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={28} color={colors.onPrimary} />
          </Pressable>
        </View>

        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={t('errors.loadFailed')} onRetry={() => void query.refetch()} />
        ) : lessons.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={t('lessons.emptyTitle')}
            message={t('lessons.emptyTeacher')}
            action={
              <Button
                title={t('lessons.new')}
                onPress={() => router.push({ pathname: '/lesson/new', params: { date: today } })}
              />
            }
          />
        ) : (
          <>
            {todays.length === 0 ? <AppText tone="muted">{t('lessons.nothingToday')}</AppText> : null}
            {todays.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} actions={actions(lesson)} />
            ))}

            <AppText variant="heading" style={styles.section}>
              {t('lessons.thisWeek')}
            </AppText>
            {later.length === 0 ? <AppText tone="muted">{t('lessons.nothingWeek')}</AppText> : null}
            {Object.entries(byDay).map(([day, dayLessons]) => (
              <View key={day} style={styles.day}>
                <AppText variant="label" tone="muted">
                  {formatDayLong(day, locale)}
                </AppText>
                {dayLessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} actions={actions(lesson)} />
                ))}
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
});
