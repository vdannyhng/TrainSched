import { DateTime } from 'luxon';

import { resolveDevSupabaseUrl } from '../devHost';
import { shouldPersistQuery } from '../persist';
import { contrastRatio, contrastText, LEVEL_COLORS, LEVELS, TAG_COLOR_PRESETS } from '../colors';
import { errorKey } from '../errors';
import { escapeLike, normalizeSearch } from '../search';
import { isValidTimezone, nowInZone, timezoneCity } from '../timezones';

describe('Farbkontrast', () => {
  it('wählt Weiss auf dunklen und Schwarz auf hellen Farben', () => {
    expect(contrastText('#1D4ED8')).toBe('#FFFFFF');
    expect(contrastText('#FDE68A')).toBe('#000000');
  });

  it.each([...LEVELS.map((l) => LEVEL_COLORS[l]), ...TAG_COLOR_PRESETS])(
    'Chip-Farbe %s erreicht WCAG AA (≥ 4.5:1) mit der gewählten Textfarbe',
    (color) => {
      expect(contrastRatio(color, contrastText(color))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('lehnt ungültige Farben ab', () => {
    expect(() => contrastText('red')).toThrow();
  });
});

describe('Suche', () => {
  it.each([
    ['Hương', 'huong'],
    ['  Trần   Thị  ', 'tran thi'],
    ['Đặng', 'dang'],
    ['Müller', 'muller'],
  ])('normalisiert %j → %j (wie unaccent in der DB)', (input, expected) => {
    expect(normalizeSearch(input)).toBe(expected);
  });

  it('entschärft LIKE-Platzhalter', () => {
    expect(escapeLike('50%_a\\b')).toBe('50\\%\\_a\\\\b');
  });
});

describe('Zeitzonen', () => {
  it('erkennt gültige IANA-Zonen', () => {
    expect(isValidTimezone('Asia/Ho_Chi_Minh')).toBe(true);
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
  });

  it('zeigt lesbare Stadtnamen', () => {
    expect(timezoneCity('Asia/Ho_Chi_Minh')).toBe('Ho Chi Minh');
  });

  it('rechnet die Ortszeit DST-sicher um (Zürich Sommerzeit → Hanoi +5 h, Winterzeit +6 h)', () => {
    const summer = DateTime.fromISO('2026-07-01T10:00', { zone: 'Europe/Zurich' });
    const winter = DateTime.fromISO('2026-12-01T10:00', { zone: 'Europe/Zurich' });
    expect(nowInZone('Asia/Ho_Chi_Minh', 'de', summer)).toBe('15:00');
    expect(nowInZone('Asia/Ho_Chi_Minh', 'de', winter)).toBe('16:00');
  });
});

describe('errorKey', () => {
  it.each([
    [{ message: 'guardian_consent_required' }, 'errors.consentRequired'],
    [{ message: 'student_already_linked' }, 'errors.alreadyLinked'],
    [{ code: '23505' }, 'errors.duplicate'],
    [{ code: '42501' }, 'errors.forbidden'],
    [{ code: 'invalid_credentials' }, 'errors.invalidCredentials'],
    [{}, 'errors.generic'],
  ])('%j → %s', (error, key) => {
    expect(errorKey(error)).toBe(key);
  });
});

describe('resolveDevSupabaseUrl', () => {
  it('ersetzt eine veraltete LAN-IP durch den Host des Dev-Servers', () => {
    expect(resolveDevSupabaseUrl('http://192.168.1.109:54321', '192.168.1.106:8081')).toBe(
      'http://192.168.1.106:54321',
    );
    expect(resolveDevSupabaseUrl('http://127.0.0.1:54321', 'localhost')).toBe('http://localhost:54321');
  });

  it('lässt Cloud-URLs und fehlende/öffentliche Dev-Hosts unverändert', () => {
    expect(resolveDevSupabaseUrl('https://abc.supabase.co', '192.168.1.106:8081')).toBe(
      'https://abc.supabase.co',
    );
    expect(resolveDevSupabaseUrl('http://192.168.1.109:54321', null)).toBe('http://192.168.1.109:54321');
    expect(resolveDevSupabaseUrl('http://192.168.1.109:54321', 'abc.exp.direct')).toBe(
      'http://192.168.1.109:54321',
    );
  });
});

describe('Offline-Cache', () => {
  const query = (key: unknown[], status: 'success' | 'error' = 'success') =>
    ({ queryKey: key, state: { status } }) as unknown as Parameters<typeof shouldPersistQuery>[0];

  it('speichert Termine, Notizen und Hausaufgaben, aber keine Anhänge-Links oder Fehler', () => {
    expect(shouldPersistQuery(query(['lessons', 'range', 'a', 'b']))).toBe(true);
    expect(shouldPersistQuery(query(['notes', 'lesson', 'x']))).toBe(true);
    expect(shouldPersistQuery(query(['homework', 'mine']))).toBe(true);
    expect(shouldPersistQuery(query(['attachments', 'lesson', 'x']))).toBe(false);
    expect(shouldPersistQuery(query(['push-status']))).toBe(false);
    expect(shouldPersistQuery(query(['lessons', 'detail', 'x'], 'error'))).toBe(false);
  });
});
