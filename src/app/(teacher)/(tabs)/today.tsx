import { useTranslation } from 'react-i18next';

import { AppText, EmptyState, Screen } from '@/components/ui';

export default function TodayScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <AppText variant="title">{t('tabs.today')}</AppText>
      <EmptyState
        icon="today-outline"
        title={t('teacher.today.emptyTitle')}
        message={t('teacher.today.emptyMessage')}
      />
    </Screen>
  );
}
