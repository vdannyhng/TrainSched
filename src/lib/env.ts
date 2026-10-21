import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { z } from 'zod';

import { resolveDevSupabaseUrl } from './devHost';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

// Expo ersetzt process.env.EXPO_PUBLIC_* zur Build-Zeit – daher explizit referenzieren.
const parsed = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!parsed.success) {
  throw new Error(
    'Supabase-Umgebungsvariablen fehlen. Kopiere .env.example nach .env.local und trage die Werte ein (siehe README).',
  );
}

function devServerHost(): string | null {
  if (!__DEV__) return null;
  if (Platform.OS === 'web') return typeof window === 'undefined' ? null : window.location.hostname;
  return Constants.expoConfig?.hostUri ?? null;
}

export const env = {
  ...parsed.data,
  EXPO_PUBLIC_SUPABASE_URL: resolveDevSupabaseUrl(parsed.data.EXPO_PUBLIC_SUPABASE_URL, devServerHost()),
};
