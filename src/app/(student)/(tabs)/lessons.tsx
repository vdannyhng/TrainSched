import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useLessonsInRange } from '@/features/lessons/api';
import { LessonCard } from '@/features/lessons/components/LessonCard';
import { useLocale, useViewerZone } from '@/features/lessons/hooks';
import { addDays, formatDayShort, localDate, rangeForDays, todayIn } from '@/lib/time';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Schüler: kommende Termine (12 Wochen), optional die letzten 8 Wochen. */
export default function LessonsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const zone = useViewerZone();
  const locale = useLocale();
  const today = todayIn(zone);
  const [showPast, setShowPast] = useState(false);
  const start = showPast ? addDays(today, -56) : today;
  const { from, to } = rangeForDays(start, (showPast ? 56 : 0) + 84, zone);
  const query = useLessonsInRange(from, to);

  const lessons = query.data ?? [];
  const upcoming = lessons.filter((l) => localDate(l.start_at, zone) >= today);
  const past = lessons.filter((l) => localDate(l.start_at, zone) < today).reverse();

  const card = (l: (typeof lessons)[number]) => (
    <LessonCard
      key={l.id}
      lesson={l}
      hrefBase="/my-lesson/"
      showDate={formatDayShort(localDate(l.start_at, zone), locale)}
    />
  );

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
        <AppText variant="title">{t('tabs.lessons')}</AppText>
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={t('errors.loadFailed')} onRetry={() => void query.refetch()} />
        ) : upcoming.length === 0 && !showPast ? (
          <EmptyState
            icon="calendar-outline"
            title={t('lessons.emptyTitle')}
            message={t('lessons.emptyStudent')}
          />
        ) : (
          <View style={styles.list}>
            <AppText variant="heading">{t('lessons.upcoming')}</AppText>
            {upcoming.map(card)}
          </View>
        )}
        {showPast && past.length ? (
          <View style={styles.list}>
            <AppText variant="heading">{t('lessons.past')}</AppText>
            {past.map(card)}
          </View>
        ) : null}
        <Button
          title={showPast ? t('lessons.hidePast') : t('lessons.showPast')}
          variant="ghost"
          onPress={() => setShowPast((v) => !v)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  list: { gap: spacing.sm },
});
