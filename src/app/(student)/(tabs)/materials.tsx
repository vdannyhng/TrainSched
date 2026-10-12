import { useTranslation } from 'react-i18next';

import { AppText, EmptyState, Screen } from '@/components/ui';

export default function MaterialsScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <AppText variant="title">{t('tabs.materials')}</AppText>
      <EmptyState
        icon="folder-open-outline"
        title={t('student.materials.emptyTitle')}
        message={t('common.comingSoon')}
      />
    </Screen>
  );
}
