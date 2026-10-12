import { useTranslation } from 'react-i18next';

import { AppText, EmptyState, Screen } from '@/components/ui';

export default function CalendarScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <AppText variant="title">{t('tabs.calendar')}</AppText>
      <EmptyState
        icon="calendar-outline"
        title={t('teacher.calendar.emptyTitle')}
        message={t('common.comingSoon')}
      />
    </Screen>
  );
}
