import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useTeacherRequests, type LessonRequest } from '@/features/requests/api';
import { RequestSummary, useSlotFormatter } from '@/features/requests/components/RequestSummary';
import { durationMinutes } from '@/lib/time';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Lehrer: offene Anfragen (älteste zuerst) und zuletzt erledigte. */
export default function RequestsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const query = useTeacherRequests();

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
        <AppText variant="title">{t('tabs.requests')}</AppText>
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={t('errors.loadFailed')} onRetry={() => void query.refetch()} />
        ) : query.data.open.length === 0 && query.data.closed.length === 0 ? (
          <EmptyState
            icon="mail-open-outline"
            title={t('teacher.requests.emptyTitle')}
            message={t('teacher.requests.emptyMessage')}
          />
        ) : (
          <>
            <AppText variant="heading">{t('requests.open')}</AppText>
            {query.data.open.length === 0 ? (
              <AppText tone="muted">{t('teacher.requests.emptyTitle')}</AppText>
            ) : (
              query.data.open.map((r) => <RequestRow key={r.id} request={r} />)
            )}
            {query.data.closed.length ? (
              <>
                <AppText variant="heading">{t('requests.closed')}</AppText>
                {query.data.closed.map((r) => (
                  <RequestRow key={r.id} request={r} />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RequestRow({ request }: { request: LessonRequest }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const formatSlot = useSlotFormatter();
  const lesson = request.lesson;
  const name = [request.student?.first_name, request.student?.last_name].filter(Boolean).join(' ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/request/${request.id}`)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: request.status === 'pending' ? colors.primary : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <AppText variant="bodyStrong">{name || '…'}</AppText>
      {lesson ? (
        <AppText tone="muted">
          {lesson.title ? `${lesson.title} · ` : ''}
          {formatSlot(lesson.start_at, durationMinutes(lesson.start_at, lesson.end_at))}
        </AppText>
      ) : (
        <AppText tone="muted">{t('errors.notFound')}</AppText>
      )}
      <View style={styles.summary}>
        <RequestSummary request={request} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  row: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  summary: { marginTop: spacing.xs },
});
