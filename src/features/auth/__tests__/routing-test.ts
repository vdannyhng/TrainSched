import { resolveAuthGate } from '../routing';

const base = { initialized: true, hasSession: true, profileError: false };
const consented = '2026-10-13T08:00:00Z';

describe('resolveAuthGate', () => {
  it('wartet, bis die Session geladen ist', () => {
    expect(resolveAuthGate({ ...base, initialized: false, profile: undefined })).toBe('loading');
  });

  it('ohne Session → Login', () => {
    expect(resolveAuthGate({ ...base, hasSession: false, profile: undefined })).toBe('signedOut');
  });

  it('mit Session, Profil lädt noch → loading', () => {
    expect(resolveAuthGate({ ...base, profile: undefined })).toBe('loading');
  });

  it('Profilfehler wird separat behandelt', () => {
    expect(resolveAuthGate({ ...base, profileError: true, profile: undefined })).toBe('profileError');
  });

  it('ohne Einwilligung → Consent-Screen, unabhängig von der Rolle', () => {
    expect(
      resolveAuthGate({
        ...base,
        profile: { role: 'admin', privacy_consent_at: null, access_paused_at: null },
      }),
    ).toBe('consent');
  });

  it('pausiertes Konto → Hinweis-Screen, auch ohne Einwilligung', () => {
    expect(
      resolveAuthGate({
        ...base,
        profile: { role: 'teacher', privacy_consent_at: null, access_paused_at: '2026-10-13T08:00:00Z' },
      }),
    ).toBe('paused');
  });

  it.each([
    ['admin', 'teacher'],
    ['teacher', 'teacher'],
    ['student', 'student'],
  ] as const)('Rolle %s → Bereich %s', (role, gate) => {
    expect(
      resolveAuthGate({ ...base, profile: { role, privacy_consent_at: consented, access_paused_at: null } }),
    ).toBe(gate);
  });
});
