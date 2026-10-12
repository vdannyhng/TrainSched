import { getCalendars } from 'expo-localization';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/AuthProvider';

/** Anzeigezone des Nutzers: Profil, sonst Gerät, sonst Zürich. */
export function useViewerZone(): string {
  const { profile } = useAuth();
  return profile?.timezone ?? getCalendars()[0]?.timeZone ?? 'Europe/Zurich';
}

export function useLocale(): string {
  return useTranslation().i18n.language;
}
