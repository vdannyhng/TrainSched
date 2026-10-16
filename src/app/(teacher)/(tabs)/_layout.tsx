import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { tabIcon, useTabScreenOptions } from '@/components/navigation/useTabScreenOptions';
import { usePendingRequestCount } from '@/features/requests/api';

export default function TeacherTabsLayout() {
  const { t } = useTranslation();
  const screenOptions = useTabScreenOptions();
  const pending = usePendingRequestCount(true);
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
        options={{
          title: t('tabs.requests'),
          tabBarIcon: tabIcon('mail-unread-outline'),
          tabBarBadge: pending.data ? pending.data : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('tabs.settings'), tabBarIcon: tabIcon('settings-outline') }}
      />
    </Tabs>
  );
}
