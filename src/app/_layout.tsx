import '@/i18n';

import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/queryClient';
import { useTheme } from '@/theme/useTheme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator fontsReady={fontsLoaded || !!fontError} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { gate } = useAuth();
  const { scheme, colors } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    if (fontsReady && gate !== 'loading') void SplashScreen.hideAsync();
  }, [fontsReady, gate]);

  if (!fontsReady) return null;

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
        <Stack.Protected guard={gate === 'signedOut' || gate === 'loading'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={gate === 'consent'}>
          <Stack.Screen name="consent" />
        </Stack.Protected>
        <Stack.Protected guard={gate === 'teacher'}>
          <Stack.Screen name="(teacher)" />
        </Stack.Protected>
        <Stack.Protected guard={gate === 'student'}>
          <Stack.Screen name="(student)" />
        </Stack.Protected>
        <Stack.Screen name="reset-password" />
      </Stack>
    </ThemeProvider>
  );
}
