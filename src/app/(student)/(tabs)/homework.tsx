import { useTranslation } from 'react-i18next';

import { AppText, EmptyState, Screen } from '@/components/ui';

export default function HomeworkScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <AppText variant="title">{t('tabs.homework')}</AppText>
      <EmptyState
        icon="checkbox-outline"
        title={t('student.homework.emptyTitle')}
        message={t('common.comingSoon')}
      />
    </Screen>
  );
}
