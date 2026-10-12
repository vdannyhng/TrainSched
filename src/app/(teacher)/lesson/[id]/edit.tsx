import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, ErrorState, FormMessage, LoadingState, Screen } from '@/components/ui';
import { useLesson, useSeries } from '@/features/lessons/api';
import { ConflictNotice } from '@/features/lessons/components/ConflictNotice';
import { LessonForm } from '@/features/lessons/components/LessonForm';
import { useViewerZone } from '@/features/lessons/hooks';
import type { LessonFormValues } from '@/features/lessons/schemas';
import { useSaveLessonFlow, type SaveResult } from '@/features/lessons/useSaveLessonFlow';
import { useTags } from '@/features/tags/api';
import { errorKey } from '@/lib/errors';
import { durationMinutes, localDate, localTime, todayIn } from '@/lib/time';

export default function EditLessonScreen() {
  const { t } = useTranslation();
  const { id, scope } = useLocalSearchParams<{ id: string; scope?: string }>();
  const mode = scope === 'following' ? 'following' : 'this';
  const zone = useViewerZone();
  const lesson = useLesson(id);
  const series = useSeries(mode === 'following' ? (lesson.data?.series_id ?? null) : null);
  const tags = useTags();
  const [result, setResult] = useState<SaveResult | null>(null);
  const flow = useSaveLessonFlow({
    mode,
    teacherId: lesson.data?.teacher_id,
    zone,
    lesson: lesson.data,
    onSaved: setResult,
  });

  if (lesson.isPending || tags.isPending || (mode === 'following' && series.isPending))
    return <LoadingState />;
  if (lesson.isError)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void lesson.refetch()} />;

  const l = lesson.data;
  if (mode === 'following' && result) {
    return (
      <Screen>
        <FormMessage
          tone="success"
          message={`${t('lessons.seriesCreated', { created: result.created })}${
            result.skipped ? ` ${t('lessons.seriesSkipped', { skipped: result.skipped })}` : ''
          }`}
        />
        <Button title={t('common.done')} onPress={() => router.dismissTo('/today')} />
      </Screen>
    );
  }

  const defaults: LessonFormValues = {
    studentIds: l.participants.map((p) => p.student_id),
    date: localDate(l.start_at, zone),
    time: localTime(l.start_at, zone),
    durationMin: durationMinutes(l.start_at, l.end_at),
    repeat: series.data?.frequency ?? 'weekly',
    endDate: '',
    format: l.format,
    location: l.location ?? '',
    meetingUrl: l.meeting_url ?? '',
    title: l.title ?? '',
    level: l.level,
    tagIds: l.tags.map((tag) => tag.id),
  };

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{ title: mode === 'following' ? t('lessons.editFollowing') : t('lessons.edit') }}
      />
      {flow.pending ? (
        <ConflictNotice
          conflicts={flow.pending.conflicts}
          bufferMinutes={flow.bufferMinutes}
          isSeries={flow.pending.isSeries}
          confirming={flow.busy}
          onConfirm={() => void flow.confirm()}
          onCancel={flow.dismiss}
        />
      ) : null}
      <FormMessage message={flow.error ? t(errorKey(flow.error)) : undefined} />
      <LessonForm
        mode={mode}
        defaultValues={defaults}
        tags={tags.data ?? []}
        today={todayIn(zone)}
        submitLabel={t('common.save')}
        submitting={flow.busy && !flow.pending}
        onSubmit={(v) => void flow.submit(v)}
      />
    </Screen>
  );
}
