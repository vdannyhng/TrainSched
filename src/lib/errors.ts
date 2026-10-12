import { authErrorKey } from '@/features/auth/errors';

export type ErrorKey =
  | ReturnType<typeof authErrorKey>
  | 'errors.forbidden'
  | 'errors.duplicate'
  | 'errors.consentRequired'
  | 'errors.alreadyLinked';

type PostgrestLikeError = { code?: string; message?: string };

/** Datenbank-/Netzwerkfehler → i18n-Key für die Anzeige. */
export function errorKey(error: unknown): ErrorKey {
  const e = (error ?? {}) as PostgrestLikeError;
  if (e.message === 'guardian_consent_required') return 'errors.consentRequired';
  if (e.message === 'student_already_linked') return 'errors.alreadyLinked';
  if (e.code === '23505') return 'errors.duplicate';
  if (e.code === '42501' || e.code === 'PGRST301') return 'errors.forbidden';
  return authErrorKey(error);
}
