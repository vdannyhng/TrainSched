import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, ErrorState, LoadingState, Screen } from '@/components/ui';
import { lessonLabel, useLesson } from '@/features/lessons/api';
import { useLocale, useViewerZone } from '@/features/lessons/hooks';
import { NoteComposer } from '@/features/notes/components/NotesSection';
import { formatDayLong, formatTimeRange, localDate } from '@/lib/time';

/** Schnell-Notiz aus der Terminkarte: Tap „Notiz“ → schreiben → speichern (≤ 3 Taps). */
export default function QuickNoteScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useViewerZone();
  const locale = useLocale();
  const lesson = useLesson(id);

  if (lesson.isPending) return <LoadingState />;
  if (lesson.isError)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void lesson.refetch()} />;
  const l = lesson.data;

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <AppText variant="heading">{lessonLabel(l)}</AppText>
      <AppText tone="muted">
        {formatDayLong(localDate(l.start_at, zone), locale)},{' '}
        {formatTimeRange(l.start_at, l.end_at, zone, locale)}
      </AppText>
      <NoteComposer
        target={{ lessonId: l.id }}
        teacherId={l.teacher_id}
        autoFocus
        onSaved={() => router.back()}
      />
    </Screen>
  );
}
