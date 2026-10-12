import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ErrorState,
  FormMessage,
  LoadingState,
  Screen,
  Segmented,
} from '@/components/ui';
import { lessonLabel, useLesson, useMarkHeld, type Attendance } from '@/features/lessons/api';
import { errorKey } from '@/lib/errors';
import { spacing } from '@/theme/tokens';

const OPTIONS: Attendance[] = ['present', 'excused', 'absent'];

/** Als gehalten markieren: Standard „anwesend“ → meist nur ein Tap auf „Speichern“. */
export default function HeldScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = useLesson(id);
  const markHeld = useMarkHeld(id);
  const [attendance, setAttendance] = useState<Record<string, Attendance>>({});

  if (lesson.isPending) return <LoadingState />;
  if (lesson.isError)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void lesson.refetch()} />;
  const l = lesson.data;

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <AppText variant="heading">{lessonLabel(l)}</AppText>
      <Card title={t('lessons.held.hint')}>
        {l.participants.map((p) => (
          <View key={p.student_id} style={styles.row}>
            <AppText variant="bodyStrong">
              {[p.student?.first_name, p.student?.last_name].filter(Boolean).join(' ')}
            </AppText>
            <Segmented
              value={attendance[p.student_id] ?? 'present'}
              onChange={(value) => setAttendance((a) => ({ ...a, [p.student_id]: value }))}
              options={OPTIONS.map((o) => ({ value: o, label: t(`lessons.attendance.${o}`) }))}
            />
          </View>
        ))}
      </Card>
      <FormMessage message={markHeld.error ? t(errorKey(markHeld.error)) : undefined} />
      <Button
        title={t('lessons.held.save')}
        loading={markHeld.isPending}
        onPress={() => markHeld.mutate(attendance, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
});
