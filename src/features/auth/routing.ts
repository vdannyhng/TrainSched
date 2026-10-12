import type { Profile } from './api';

export type AuthGate = 'loading' | 'signedOut' | 'consent' | 'teacher' | 'student' | 'profileError';

type Input = {
  initialized: boolean;
  hasSession: boolean;
  profile: Pick<Profile, 'role' | 'privacy_consent_at'> | undefined;
  profileError: boolean;
};

/**
 * Entscheidet, welcher Bereich der App sichtbar ist. Reine Funktion → gut testbar.
 * Hinweis: Das ist nur UX – die eigentlichen Rechte erzwingt RLS auf dem Server.
 */
export function resolveAuthGate({ initialized, hasSession, profile, profileError }: Input): AuthGate {
  if (!initialized) return 'loading';
  if (!hasSession) return 'signedOut';
  if (profileError) return 'profileError';
  if (!profile) return 'loading';
  if (!profile.privacy_consent_at) return 'consent';
  return profile.role === 'student' ? 'student' : 'teacher';
}

export const homeHrefForGate = {
  signedOut: '/sign-in',
  consent: '/consent',
  teacher: '/today',
  student: '/lessons',
} as const satisfies Partial<Record<AuthGate, string>>;
