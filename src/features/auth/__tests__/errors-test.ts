import { AppError, authErrorKey, inviteErrorKey } from '../errors';

describe('authErrorKey', () => {
  it.each([
    [{ code: 'invalid_credentials' }, 'errors.invalidCredentials'],
    [{ status: 429 }, 'errors.rateLimited'],
    [{ code: 'over_email_send_rate_limit' }, 'errors.rateLimited'],
    [{ name: 'AuthRetryableFetchError' }, 'errors.network'],
    [{ message: 'irgendwas' }, 'errors.generic'],
    [null, 'errors.generic'],
  ])('%j → %s', (error, key) => {
    expect(authErrorKey(error)).toBe(key);
  });

  it('reicht AppError-Keys durch', () => {
    expect(authErrorKey(new AppError('errors.emailTaken'))).toBe('errors.emailTaken');
  });
});

describe('inviteErrorKey', () => {
  it('mappt Server-Codes auf Meldungen', () => {
    expect(inviteErrorKey('invalid_code')).toBe('errors.invalidCode');
    expect(inviteErrorKey('rate_limited')).toBe('errors.rateLimited');
    expect(inviteErrorKey('email_taken')).toBe('errors.emailTaken');
    expect(inviteErrorKey('server_error')).toBe('errors.generic');
    expect(inviteErrorKey(undefined)).toBe('errors.generic');
  });
});
