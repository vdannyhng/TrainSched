import { useTranslation } from 'react-i18next';

import { AppText, EmptyState, Screen } from '@/components/ui';

export default function LessonsScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <AppText variant="title">{t('tabs.lessons')}</AppText>
      <EmptyState
        icon="calendar-outline"
        title={t('student.lessons.emptyTitle')}
        message={t('student.lessons.emptyMessage')}
      />
    </Screen>
  );
}
