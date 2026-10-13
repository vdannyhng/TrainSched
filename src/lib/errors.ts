import { authErrorKey } from '@/features/auth/errors';

export type ErrorKey =
  | ReturnType<typeof authErrorKey>
  | 'errors.forbidden'
  | 'errors.duplicate'
  | 'errors.consentRequired'
  | 'errors.alreadyLinked'
  | 'errors.overlap'
  | 'errors.participantsRequired'
  | 'errors.participantsOtherTeacher'
  | 'errors.cannotPauseSelf'
  | 'errors.notFound';

type PostgrestLikeError = { code?: string; message?: string };

const MESSAGE_KEYS: Record<string, ErrorKey> = {
  guardian_consent_required: 'errors.consentRequired',
  student_already_linked: 'errors.alreadyLinked',
  participants_required: 'errors.participantsRequired',
  participants_other_teacher: 'errors.participantsOtherTeacher',
  cannot_pause_self: 'errors.cannotPauseSelf',
};

/** Datenbank-/Netzwerkfehler → i18n-Key für die Anzeige. */
export function errorKey(error: unknown): ErrorKey {
  const e = (error ?? {}) as PostgrestLikeError;
  if (e.message && e.message in MESSAGE_KEYS) return MESSAGE_KEYS[e.message]!;
  if (e.code === '23P01') return 'errors.overlap';
  if (e.code === '23505') return 'errors.duplicate';
  if (e.code === '42501' || e.code === 'PGRST301') return 'errors.forbidden';
  if (e.code === 'P0002' || e.code === 'PGRST116') return 'errors.notFound';
  return authErrorKey(error);
}
