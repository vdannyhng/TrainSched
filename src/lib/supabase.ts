import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

import { env } from './env';

export const supabase = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // PKCE: Passwort-Reset-Links liefern einen `code`, der in der App eingetauscht wird.
      flowType: 'pkce',
    },
  },
);

// Token-Refresh nur, solange die App im Vordergrund ist.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
