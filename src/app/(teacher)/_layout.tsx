import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { fontFamily } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function TeacherLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: fontFamily.semibold, color: colors.text },
        headerBackTitle: t('common.back'),
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="student/new" options={{ title: t('students.new') }} />
      <Stack.Screen name="student/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="student/[id]/edit" options={{ title: t('students.edit') }} />
      <Stack.Screen name="topics" options={{ title: t('topics.title') }} />
      <Stack.Screen name="lesson/new" options={{ title: t('lessons.new') }} />
      <Stack.Screen name="lesson/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="lesson/[id]/edit" options={{ title: t('lessons.edit') }} />
      <Stack.Screen name="lesson/[id]/reschedule" options={{ title: t('lessons.reschedule.title') }} />
      <Stack.Screen name="lesson/[id]/cancel" options={{ title: t('lessons.cancel.title') }} />
      <Stack.Screen name="lesson/[id]/held" options={{ title: t('lessons.held.title') }} />
      <Stack.Screen name="blocker/new" options={{ title: t('blockers.new') }} />
      <Stack.Screen name="blocker/[id]" options={{ title: t('blockers.edit') }} />
    </Stack>
  );
}
