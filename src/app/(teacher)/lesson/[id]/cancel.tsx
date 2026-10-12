import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, ErrorState, FormMessage, LoadingState, Screen, TextField } from '@/components/ui';
import { lessonLabel, useCancelLesson, useLesson } from '@/features/lessons/api';
import { useLocale, useViewerZone } from '@/features/lessons/hooks';
import { errorKey } from '@/lib/errors';
import { formatDayLong, formatTimeRange, localDate } from '@/lib/time';

export default function CancelLessonScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useViewerZone();
  const locale = useLocale();
  const lesson = useLesson(id);
  const cancel = useCancelLesson(id);
  const [reason, setReason] = useState('');

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
      <TextField
        label={t('lessons.cancel.reason')}
        placeholder={t('lessons.cancel.reasonPlaceholder')}
        value={reason}
        onChangeText={setReason}
        maxLength={500}
        multiline
      />
      <FormMessage message={cancel.error ? t(errorKey(cancel.error)) : undefined} />
      <Button
        title={t('lessons.cancel.confirm')}
        variant="danger"
        loading={cancel.isPending}
        onPress={() => cancel.mutate(reason, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}
