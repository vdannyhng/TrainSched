import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FormMessage, LoadingState, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCreateStudent } from '@/features/students/api';
import { StudentForm } from '@/features/students/components/StudentForm';
import { emptyStudentForm } from '@/features/students/schemas';
import { useTags } from '@/features/tags/api';
import { errorKey } from '@/lib/errors';

export default function NewStudentScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const tags = useTags();
  const create = useCreateStudent(session?.user.id);

  if (tags.isPending) return <LoadingState />;

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <FormMessage message={create.error ? t(errorKey(create.error)) : undefined} />
      <StudentForm
        defaultValues={emptyStudentForm}
        tags={tags.data ?? []}
        submitLabel={t('common.create')}
        submitting={create.isPending}
        onSubmit={(values) => create.mutate(values, { onSuccess: (id) => router.replace(`/student/${id}`) })}
      />
    </Screen>
  );
}
