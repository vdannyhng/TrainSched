import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import i18n, { isAppLocale } from '@/i18n';
import { queryPersister } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

import { fetchProfile, type Profile } from './api';
import { resolveAuthGate, type AuthGate } from './routing';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | undefined;
  gate: AuthGate;
  refetchProfile: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const profileQueryKey = (userId: string | undefined) => ['profile', userId] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setInitialized(true));

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') {
        // Offline-Cache gehört zum Konto → beim Abmelden sofort vom Gerät entfernen
        queryClient.clear();
        void queryPersister.removeClient();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  // UI-Sprache folgt dem Profil.
  const locale = profileQuery.data?.locale;
  useEffect(() => {
    if (isAppLocale(locale) && i18n.language !== locale) void i18n.changeLanguage(locale);
  }, [locale]);

  const gate = resolveAuthGate({
    initialized,
    hasSession: !!session,
    profile: profileQuery.data,
    profileError: profileQuery.isError,
  });

  return (
    <AuthContext.Provider
      value={{ session, profile: profileQuery.data, gate, refetchProfile: () => void profileQuery.refetch() }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
