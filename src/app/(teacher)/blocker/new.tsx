import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FormMessage, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { emptyBlockerForm, useSaveBlocker } from '@/features/blockers/api';
import { BlockerForm } from '@/features/blockers/components/BlockerForm';
import { useViewerZone } from '@/features/lessons/hooks';
import { errorKey } from '@/lib/errors';
import { isValidLocalDate, isValidLocalTime, todayIn } from '@/lib/time';

export default function NewBlockerScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ date?: string; time?: string; duration?: string }>();
  const zone = useViewerZone();
  const today = todayIn(zone);
  const save = useSaveBlocker(session?.user.id);

  const date = params.date && isValidLocalDate(params.date) ? params.date : today;
  const time = params.time && isValidLocalTime(params.time) ? params.time : '08:00';

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <FormMessage message={save.error ? t(errorKey(save.error)) : undefined} />
      <BlockerForm
        defaultValues={emptyBlockerForm(date, time, Number(params.duration) || undefined)}
        today={today}
        submitLabel={t('common.create')}
        submitting={save.isPending}
        onSubmit={(values) => save.mutate({ values, timezone: zone }, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}
