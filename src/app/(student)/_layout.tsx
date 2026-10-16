import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { fontFamily } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function StudentLayout() {
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
      <Stack.Screen name="my-lesson/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="my-lesson/[id]/request" options={{ title: t('requests.formTitle') }} />
    </Stack>
  );
}
