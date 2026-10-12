import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { tabIcon, useTabScreenOptions } from '@/components/navigation/useTabScreenOptions';

export default function StudentTabsLayout() {
  const { t } = useTranslation();
  const screenOptions = useTabScreenOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="lessons"
        options={{ title: t('tabs.lessons'), tabBarIcon: tabIcon('calendar-outline') }}
      />
      <Tabs.Screen
        name="homework"
        options={{ title: t('tabs.homework'), tabBarIcon: tabIcon('checkbox-outline') }}
      />
      <Tabs.Screen
        name="materials"
        options={{ title: t('tabs.materials'), tabBarIcon: tabIcon('folder-open-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('person-circle-outline') }}
      />
    </Tabs>
  );
}
