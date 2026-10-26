import '@/i18n';

import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { configureNotifications } from '@/features/push/push';
import { PushBridge } from '@/features/push/PushBridge';
import { OfflineBanner } from '@/components/OfflineBanner';
import { persistOptions, queryClient } from '@/lib/queryClient';
import { fontFamily } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

void SplashScreen.preventAutoHideAsync();
configureNotifications();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  return (
    <GestureHandlerRootView style={styles.root}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <AuthProvider>
          <RootNavigator fontsReady={fontsLoaded || !!fontError} />
        </AuthProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { t } = useTranslation();
  const { gate, session } = useAuth();
  const { scheme, colors } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    if (fontsReady && gate !== 'loading') void SplashScreen.hideAsync();
  }, [fontsReady, gate]);

  // Navigator erst rendern, wenn Rolle bekannt ist – sonst leiten die Guards
  // Deep Links (z. B. /student/123) vorzeitig auf die Startseite um.
  if (!fontsReady || gate === 'loading') return null;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
        },
      }}
    >
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Guards sind nur UX. Rechte erzwingt RLS auf dem Server. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={gate === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={gate === 'consent'}>
          <Stack.Screen name="consent" />
        </Stack.Protected>
        <Stack.Protected guard={gate === 'paused'}>
          <Stack.Screen name="paused" />
        </Stack.Protected>
        <Stack.Protected guard={gate === 'teacher'}>
          <Stack.Screen name="(teacher)" />
        </Stack.Protected>
        <Stack.Protected guard={gate === 'student'}>
          <Stack.Screen name="(student)" />
        </Stack.Protected>
        <Stack.Screen name="reset-password" />
        <Stack.Screen
          name="privacy"
          options={{
            headerShown: true,
            title: t('privacy.title'),
            headerBackTitle: t('common.back'),
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
            headerTitleStyle: { fontFamily: fontFamily.semibold, color: colors.text },
          }}
        />
        <Stack.Screen
          name="anleitung"
          options={{
            headerShown: true,
            title: t('help.title'),
            headerBackTitle: t('common.back'),
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
            headerTitleStyle: { fontFamily: fontFamily.semibold, color: colors.text },
          }}
        />
      </Stack>
      {session && (gate === 'teacher' || gate === 'student') ? <PushBridge userId={session.user.id} /> : null}
      <OfflineBanner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
