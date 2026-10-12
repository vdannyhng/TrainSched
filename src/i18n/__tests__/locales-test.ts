import { validationMessage } from '@/lib/validation';

import de from '../locales/de.json';
import vi from '../locales/vi.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...acc, [path]: value } : { ...acc, ...flatten(value, path) };
  }, {});
}

const deKeys = flatten(de);
const viKeys = flatten(vi);

describe('Übersetzungen', () => {
  it('Deutsch und Vietnamesisch haben dieselben Keys', () => {
    expect(Object.keys(viKeys).sort()).toEqual(Object.keys(deKeys).sort());
  });

  it('keine leeren Texte', () => {
    for (const [key, value] of Object.entries({ ...deKeys, ...viKeys })) {
      expect({ key, empty: value.trim() === '' }).toEqual({ key, empty: false });
    }
  });

  it('vietnamesische Texte enthalten Diakritika (Sanity-Check gegen versehentliches ASCII)', () => {
    expect(viKeys['auth.signIn.title']).toBe('Đăng nhập');
    expect(
      Object.values(viKeys).some((v) => /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(v)),
    ).toBe(true);
  });

  it('jede Zod-Fehlermeldung hat einen Übersetzungs-Key', () => {
    for (const message of [
      'required',
      'invalid_email',
      'invalid_code',
      'password_too_short',
      'password_too_long',
      'password_letters_digits',
      'passwords_mismatch',
    ]) {
      expect(validationMessage(message)).toBe(`validation.${message}`);
    }
    expect(validationMessage('unbekannt')).toBe('validation.required');
  });
});
