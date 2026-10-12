import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, ErrorState, FormMessage, LoadingState, Screen } from '@/components/ui';
import { lessonLabel, useLesson } from '@/features/lessons/api';
import { LessonDetailBody } from '@/features/lessons/components/LessonDetailBody';
import { shareIcs } from '@/features/lessons/shareIcs';

/** Termin aus Schülersicht (nur lesen + Kalender-Export). */
export default function MyLessonScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = useLesson(id);
  const [exportError, setExportError] = useState(false);

  if (lesson.isPending) return <LoadingState />;
  if (lesson.isError)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void lesson.refetch()} />;
  const l = lesson.data;

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <LessonDetailBody lesson={l} showAttendance={false} />
      <FormMessage message={exportError ? t('errors.exportFailed') : undefined} />
      <Button
        title={t('lessons.actions.exportIcs')}
        variant="secondary"
        onPress={() =>
          void shareIcs(`trainsched-${l.id.slice(0, 8)}.ics`, [
            {
              uid: l.id,
              start: l.start_at,
              end: l.end_at,
              summary: `TrainSched: ${lessonLabel(l, t('lessons.defaultLabel'))}`,
              location: l.format === 'online' ? (l.meeting_url ?? undefined) : (l.location ?? undefined),
              url: l.meeting_url ?? undefined,
              cancelled: l.status === 'cancelled',
            },
          ]).catch(() => setExportError(true))
        }
      />
    </Screen>
  );
}
