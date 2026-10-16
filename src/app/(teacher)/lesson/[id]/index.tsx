import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ErrorState, FormMessage, LoadingState, Screen } from '@/components/ui';
import {
  lessonLabel,
  useDeleteLesson,
  useEndSeries,
  useLesson,
  useRestoreLesson,
  useSeries,
} from '@/features/lessons/api';
import { AttachmentsSection } from '@/features/attachments/components/AttachmentsSection';
import { LessonHomeworkSection } from '@/features/homework/components/LessonHomeworkSection';
import { LessonDetailBody } from '@/features/lessons/components/LessonDetailBody';
import { PreviousLessonCard } from '@/features/lessons/components/PreviousLessonCard';
import { useLocale, useViewerZone } from '@/features/lessons/hooks';
import { NotesSection } from '@/features/notes/components/NotesSection';
import { LessonPendingRequests } from '@/features/requests/components/LessonPendingRequests';
import { shareIcs } from '@/features/lessons/shareIcs';
import { confirmAsync } from '@/lib/confirm';
import { errorKey } from '@/lib/errors';
import { formatDayLong, todayIn } from '@/lib/time';
import { spacing } from '@/theme/tokens';

export default function LessonDetailScreen() {
  const { t } = useTranslation();
  const locale = useLocale();
  const zone = useViewerZone();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = useLesson(id);
  const series = useSeries(lesson.data?.series_id ?? null);
  const restore = useRestoreLesson(id);
  const endSeries = useEndSeries(id);
  const remove = useDeleteLesson();
  const [chooseScope, setChooseScope] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (lesson.isPending) return <LoadingState />;
  if (lesson.isError)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void lesson.refetch()} />;

  const l = lesson.data;
  const status = l.status;
  const error = restore.error ?? endSeries.error ?? remove.error;

  const exportIcs = () =>
    shareIcs(`trainsched-${l.id.slice(0, 8)}.ics`, [
      {
        uid: l.id,
        start: l.start_at,
        end: l.end_at,
        summary: `TrainSched: ${lessonLabel(l)}`,
        location: l.format === 'online' ? (l.meeting_url ?? undefined) : (l.location ?? undefined),
        url: l.meeting_url ?? undefined,
        cancelled: status === 'cancelled',
      },
    ]).catch(() => setMessage(t('errors.exportFailed')));

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: '' }} />
      <LessonDetailBody lesson={l} showAttendance />
      <LessonPendingRequests lessonId={l.id} />

      {series.data ? (
        <Card title={t('lessons.detail.series')}>
          <AppText>
            {t('lessons.detail.seriesInfo', {
              frequency: t(`lessons.repeat.${series.data.frequency}`),
              start: formatDayLong(series.data.start_date, locale),
            })}
            {series.data.end_date
              ? ` ${t('lessons.detail.seriesUntil', { end: formatDayLong(series.data.end_date, locale) })}`
              : ''}
          </AppText>
        </Card>
      ) : null}

      <FormMessage message={error ? t(errorKey(error)) : undefined} />
      <FormMessage tone="success" message={message ?? undefined} />

      <View style={styles.actions}>
        {status === 'scheduled' ? (
          <>
            <Button
              title={t('lessons.actions.reschedule')}
              onPress={() => router.push(`/lesson/${l.id}/reschedule`)}
            />
            <Button
              title={t('lessons.actions.markHeld')}
              variant="secondary"
              onPress={() => router.push(`/lesson/${l.id}/held`)}
            />
            {chooseScope ? (
              <Card title={t('lessons.editScopeTitle')}>
                <Button
                  title={t('lessons.actions.editThis')}
                  variant="secondary"
                  onPress={() =>
                    router.push({ pathname: '/lesson/[id]/edit', params: { id: l.id, scope: 'this' } })
                  }
                />
                <Button
                  title={t('lessons.actions.editFollowing')}
                  variant="secondary"
                  onPress={() =>
                    router.push({ pathname: '/lesson/[id]/edit', params: { id: l.id, scope: 'following' } })
                  }
                />
              </Card>
            ) : (
              <Button
                title={t('lessons.actions.edit')}
                variant="secondary"
                onPress={() =>
                  l.series_id
                    ? setChooseScope(true)
                    : router.push({ pathname: '/lesson/[id]/edit', params: { id: l.id, scope: 'this' } })
                }
              />
            )}
            <Button
              title={t('lessons.actions.cancel')}
              variant="secondary"
              onPress={() => router.push(`/lesson/${l.id}/cancel`)}
            />
          </>
        ) : null}
        {status === 'cancelled' ? (
          <Button
            title={t('lessons.actions.restore')}
            variant="secondary"
            loading={restore.isPending}
            onPress={() => restore.mutate()}
          />
        ) : null}
      </View>

      <PreviousLessonCard lessonId={l.id} hrefBase="/lesson/" />
      <NotesSection target={{ lessonId: l.id }} teacherId={l.teacher_id} />
      <LessonHomeworkSection lesson={l} today={todayIn(zone)} />
      <AttachmentsSection target={{ lessonId: l.id }} teacherId={l.teacher_id} />

      <View style={styles.actions}>
        <Button title={t('lessons.actions.exportIcs')} variant="ghost" onPress={() => void exportIcs()} />
        {l.series_id && status === 'scheduled' ? (
          <Button
            title={t('lessons.actions.endSeries')}
            variant="ghost"
            loading={endSeries.isPending}
            onPress={async () => {
              const ok = await confirmAsync({
                title: t('lessons.endSeries.title'),
                message: t('lessons.endSeries.message'),
                confirmLabel: t('lessons.actions.endSeries'),
                cancelLabel: t('common.cancel'),
                destructive: true,
              });
              if (ok) endSeries.mutate(undefined, { onSuccess: () => router.back() });
            }}
          />
        ) : null}
        <Button
          title={t('lessons.actions.delete')}
          variant="ghost"
          loading={remove.isPending}
          onPress={async () => {
            const ok = await confirmAsync({
              title: t('lessons.deleteTitle'),
              message: t('lessons.deleteMessage'),
              confirmLabel: t('common.delete'),
              cancelLabel: t('common.cancel'),
              destructive: true,
            });
            if (ok) remove.mutate(l.id, { onSuccess: () => router.back() });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
});
