import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, ErrorState, FormMessage, LoadingState, Screen } from '@/components/ui';
import { toBlockerForm, useBlocker, useDeleteBlocker, useSaveBlocker } from '@/features/blockers/api';
import { BlockerForm } from '@/features/blockers/components/BlockerForm';
import { useViewerZone } from '@/features/lessons/hooks';
import { confirmAsync } from '@/lib/confirm';
import { errorKey } from '@/lib/errors';
import { todayIn } from '@/lib/time';
import { spacing } from '@/theme/tokens';

export default function EditBlockerScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useViewerZone();
  const blocker = useBlocker(id);
  const save = useSaveBlocker(blocker.data?.teacher_id);
  const remove = useDeleteBlocker();

  if (blocker.isPending) return <LoadingState />;
  if (blocker.isError)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void blocker.refetch()} />;
  const b = blocker.data;

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <FormMessage
        message={save.error || remove.error ? t(errorKey(save.error ?? remove.error)) : undefined}
      />
      <BlockerForm
        defaultValues={toBlockerForm(b)}
        today={todayIn(zone)}
        submitLabel={t('common.save')}
        submitting={save.isPending}
        onSubmit={(values) =>
          save.mutate({ id: b.id, values, timezone: b.timezone }, { onSuccess: () => router.back() })
        }
      />
      <View style={{ marginTop: spacing.lg }}>
        <Button
          title={t('blockers.delete')}
          variant="danger"
          loading={remove.isPending}
          onPress={async () => {
            const ok = await confirmAsync({
              title: t('blockers.deleteTitle', { title: b.title }),
              message: b.end_date === b.start_date ? undefined : t('blockers.deleteSeriesMessage'),
              confirmLabel: t('common.delete'),
              cancelLabel: t('common.cancel'),
              destructive: true,
            });
            if (ok) remove.mutate(b.id, { onSuccess: () => router.back() });
          }}
        />
      </View>
    </Screen>
  );
}
