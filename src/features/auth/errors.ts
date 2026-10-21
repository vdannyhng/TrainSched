import type { AcceptInviteErrorCode } from '../../../supabase/functions/_shared/inviteSchema';

export type AuthErrorKey =
  | 'errors.generic'
  | 'errors.network'
  | 'errors.invalidCredentials'
  | 'errors.invalidCode'
  | 'errors.emailTaken'
  | 'errors.rateLimited';

/** Thrown by the API layer, carries an i18n key the UI can show directly. */
export class AppError extends Error {
  constructor(public readonly key: AuthErrorKey) {
    super(key);
    this.name = 'AppError';
  }
}

type SupabaseLikeError = { code?: string; status?: number; name?: string; message?: string };

/** Supabase-Auth-Fehler → i18n-Key. Bewusst grob, damit keine Konto-Existenz verraten wird. */
export function authErrorKey(error: unknown): AuthErrorKey {
  if (error instanceof AppError) return error.key;
  const e = (error ?? {}) as SupabaseLikeError;
  if (e.code === 'invalid_credentials' || e.code === 'email_not_confirmed')
    return 'errors.invalidCredentials';
  if (e.code === 'over_request_rate_limit' || e.code === 'over_email_send_rate_limit' || e.status === 429) {
    return 'errors.rateLimited';
  }
  if (
    e.name === 'AuthRetryableFetchError' ||
    e.name === 'FunctionsFetchError' ||
    e.message === 'Network request failed'
  ) {
    return 'errors.network';
  }
  return 'errors.generic';
}

export function inviteErrorKey(code: AcceptInviteErrorCode | undefined): AuthErrorKey {
  switch (code) {
    case 'invalid_code':
      return 'errors.invalidCode';
    case 'email_taken':
      return 'errors.emailTaken';
    case 'rate_limited':
      return 'errors.rateLimited';
    default:
      return 'errors.generic';
  }
}
