import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useMyHomework } from '@/features/homework/api';
import { HomeworkItem } from '@/features/homework/components/HomeworkItem';
import { useViewerZone } from '@/features/lessons/hooks';
import { todayIn } from '@/lib/time';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Schüler: offene Hausaufgaben (nach Fälligkeit), erledigte einblendbar, Abhaken per Tap. */
export default function HomeworkScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const today = todayIn(useViewerZone());
  const query = useMyHomework(true);
  const [showDone, setShowDone] = useState(false);
  const all = query.data ?? [];
  const open = all.filter((h) => h.status === 'open');
  const done = all.filter((h) => h.status === 'done');

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
        <AppText variant="title">{t('tabs.homework')}</AppText>
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={t('errors.loadFailed')} onRetry={() => void query.refetch()} />
        ) : all.length === 0 ? (
          <EmptyState icon="checkbox-outline" title={t('student.homework.emptyTitle')} />
        ) : (
          <View style={styles.list}>
            {open.length === 0 ? <AppText tone="success">{t('homework.noneOpen')}</AppText> : null}
            {open.map((h) => (
              <HomeworkItem key={h.id} homework={h} today={today} />
            ))}
            {showDone ? done.map((h) => <HomeworkItem key={h.id} homework={h} today={today} />) : null}
            {done.length > 0 ? (
              <Button
                title={showDone ? t('homework.hideDone') : `${t('homework.showDone')} (${done.length})`}
                variant="ghost"
                onPress={() => setShowDone((v) => !v)}
              />
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  list: { gap: spacing.xs },
});
