import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, ErrorState, FormMessage, LoadingState, Screen } from '@/components/ui';
import { useDeleteStudent, useStudent, useUpdateStudent } from '@/features/students/api';
import { StudentForm } from '@/features/students/components/StudentForm';
import { toStudentForm } from '@/features/students/schemas';
import { useTags } from '@/features/tags/api';
import { confirmAsync } from '@/lib/confirm';
import { errorKey } from '@/lib/errors';
import { spacing } from '@/theme/tokens';

export default function EditStudentScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const student = useStudent(id);
  const tags = useTags(student.data?.teacher_id);
  const update = useUpdateStudent(student.data);
  const remove = useDeleteStudent();

  if (student.isPending || tags.isPending) return <LoadingState />;
  if (student.isError)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void student.refetch()} />;

  const s = student.data;
  const name = [s.first_name, s.last_name].filter(Boolean).join(' ');

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <FormMessage message={update.error ? t(errorKey(update.error)) : undefined} />
      <StudentForm
        defaultValues={toStudentForm(
          s,
          s.tags.map((tag) => tag.id),
        )}
        tags={tags.data ?? []}
        submitLabel={t('common.save')}
        submitting={update.isPending}
        onSubmit={(values) => update.mutate(values, { onSuccess: () => router.back() })}
      />
      <View style={{ marginTop: spacing.xl }}>
        <FormMessage message={remove.error ? t(errorKey(remove.error)) : undefined} />
        <Button
          title={t('students.deleteButton')}
          variant="danger"
          loading={remove.isPending}
          onPress={async () => {
            const ok = await confirmAsync({
              title: t('students.deleteTitle', { name }),
              message: t('students.deleteMessage'),
              confirmLabel: t('common.delete'),
              cancelLabel: t('common.cancel'),
              destructive: true,
            });
            if (ok) remove.mutate(s.id, { onSuccess: () => router.dismissTo('/students') });
          }}
        />
      </View>
    </Screen>
  );
}
