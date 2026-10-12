import {
  formatInviteCode,
  inviteFormSchema,
  normalizeInviteCode,
  resetPasswordSchema,
  signInSchema,
} from '../schemas';

const issues = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues.map((i) => i.message) ?? []);

describe('Einladungscode', () => {
  it('normalisiert Kleinschreibung, Leerzeichen und Bindestriche', () => {
    expect(normalizeInviteCode(' abcd-ef gh ')).toBe('ABCDEFGH');
  });

  it('formatiert für Menschen als ABCD-EFGH', () => {
    expect(formatInviteCode('abcdefgh')).toBe('ABCD-EFGH');
    expect(formatInviteCode('abc')).toBe('ABC');
  });

  const valid = { email: 'Thao@Example.com ', password: 'geheim123', passwordConfirm: 'geheim123' };

  it('akzeptiert gültigen Code und normalisiert E-Mail', () => {
    const result = inviteFormSchema.safeParse({ ...valid, code: 'abcd-efgh' });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ code: 'ABCDEFGH', email: 'thao@example.com' });
  });

  it.each([
    ['zu kurz', 'ABC'],
    ['mehrdeutige Zeichen 0/O/1/I', 'ABCD0O1I'],
    ['zu lang', 'ABCDEFGHJ'],
  ])('lehnt Code ab: %s', (_label, code) => {
    expect(issues(inviteFormSchema.safeParse({ ...valid, code }))).toContain('invalid_code');
  });

  it('verlangt übereinstimmende Passwörter', () => {
    const result = inviteFormSchema.safeParse({ ...valid, code: 'ABCDEFGH', passwordConfirm: 'anders123' });
    expect(issues(result)).toEqual(['passwords_mismatch']);
  });
});

describe('Passwortregeln', () => {
  it.each([
    ['kurz1', 'password_too_short'],
    ['nurbuchstaben', 'password_letters_digits'],
    ['1234567890', 'password_letters_digits'],
  ])('%s → %s', (password, expected) => {
    expect(issues(resetPasswordSchema.safeParse({ password, passwordConfirm: password }))).toContain(
      expected,
    );
  });

  it('akzeptiert Unicode-Passwörter mit Buchstaben und Zahlen', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'Hương2026', passwordConfirm: 'Hương2026' }).success,
    ).toBe(true);
  });
});

describe('Login', () => {
  it('meldet ungültige E-Mail und leeres Passwort', () => {
    expect(issues(signInSchema.safeParse({ email: 'kein-at', password: '' }))).toEqual([
      'invalid_email',
      'required',
    ]);
  });
});
