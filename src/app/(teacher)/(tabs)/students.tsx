import { useTranslation } from 'react-i18next';

import { AppText, EmptyState, Screen } from '@/components/ui';

export default function StudentsScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <AppText variant="title">{t('tabs.students')}</AppText>
      <EmptyState
        icon="people-outline"
        title={t('teacher.students.emptyTitle')}
        message={t('common.comingSoon')}
      />
    </Screen>
  );
}
