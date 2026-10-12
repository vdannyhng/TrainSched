import { useTranslation } from 'react-i18next';

import { AppText, EmptyState, Screen } from '@/components/ui';

export default function RequestsScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <AppText variant="title">{t('tabs.requests')}</AppText>
      <EmptyState
        icon="mail-open-outline"
        title={t('teacher.requests.emptyTitle')}
        message={t('common.comingSoon')}
      />
    </Screen>
  );
}
