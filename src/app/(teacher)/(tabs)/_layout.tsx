import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { tabIcon, useTabScreenOptions } from '@/components/navigation/useTabScreenOptions';

export default function TeacherTabsLayout() {
  const { t } = useTranslation();
  const screenOptions = useTabScreenOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="today" options={{ title: t('tabs.today'), tabBarIcon: tabIcon('today-outline') }} />
      <Tabs.Screen
        name="calendar"
        options={{ title: t('tabs.calendar'), tabBarIcon: tabIcon('calendar-outline') }}
      />
      <Tabs.Screen
        name="students"
        options={{ title: t('tabs.students'), tabBarIcon: tabIcon('people-outline') }}
      />
      <Tabs.Screen
        name="requests"
        options={{ title: t('tabs.requests'), tabBarIcon: tabIcon('mail-unread-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('tabs.settings'), tabBarIcon: tabIcon('settings-outline') }}
      />
    </Tabs>
  );
}
