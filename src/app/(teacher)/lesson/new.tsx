import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, FormMessage, LoadingState, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { ConflictNotice } from '@/features/lessons/components/ConflictNotice';
import { LessonForm } from '@/features/lessons/components/LessonForm';
import { useViewerZone } from '@/features/lessons/hooks';
import { emptyLessonForm } from '@/features/lessons/schemas';
import { useSaveLessonFlow, type SaveResult } from '@/features/lessons/useSaveLessonFlow';
import { useTags } from '@/features/tags/api';
import { errorKey } from '@/lib/errors';
import { isValidLocalDate, isValidLocalTime, todayIn } from '@/lib/time';

export default function NewLessonScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ date?: string; studentId?: string; time?: string }>();
  const zone = useViewerZone();
  const today = todayIn(zone);
  const tags = useTags(session?.user.id);
  const [seriesResult, setSeriesResult] = useState<SaveResult | null>(null);
  const flow = useSaveLessonFlow({
    mode: 'create',
    teacherId: session?.user.id,
    zone,
    onSaved: (r) => setSeriesResult(r),
  });

  if (tags.isPending) return <LoadingState />;

  const date = params.date && isValidLocalDate(params.date) && params.date >= today ? params.date : today;

  if (seriesResult && seriesResult.created !== 1) {
    return (
      <Screen>
        <FormMessage
          tone="success"
          message={`${t('lessons.seriesCreated', { created: seriesResult.created })}${
            seriesResult.skipped ? ` ${t('lessons.seriesSkipped', { skipped: seriesResult.skipped })}` : ''
          }`}
        />
        <Button title={t('common.done')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom', 'left', 'right']} scrollToEnd={!!flow.pending || !!flow.error}>
      <LessonForm
        mode="create"
        defaultValues={emptyLessonForm(
          date,
          params.studentId ? [params.studentId] : [],
          params.time && isValidLocalTime(params.time) ? params.time : undefined,
        )}
        tags={tags.data ?? []}
        today={today}
        submitLabel={t('common.create')}
        submitting={flow.busy && !flow.pending}
        onSubmit={(v) => void flow.submit(v)}
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
    </Screen>
  );
}
