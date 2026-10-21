import { decryptString, encryptString, isEncrypted, utf8Decode, utf8Encode } from '../cipher';

const key = new Uint8Array(32).fill(7);
const otherKey = new Uint8Array(32).fill(8);
const nonce = new Uint8Array(12).fill(1);

describe('Verschlüsselung auf dem Gerät (AES-256-GCM)', () => {
  it('ver- und entschlüsselt inkl. vietnamesischer Zeichen', () => {
    const stored = encryptString(key, '{"note":"Hương học tốt"}', nonce);
    expect(isEncrypted(stored)).toBe(true);
    expect(stored).not.toContain('Hương');
    expect(decryptString(key, stored)).toBe('{"note":"Hương học tốt"}');
  });

  it('erkennt falschen Schlüssel und Manipulation', () => {
    const stored = encryptString(key, 'geheim', nonce);
    expect(decryptString(otherKey, stored)).toBeNull();
    const last = stored.slice(-1) === '0' ? '1' : '0';
    expect(decryptString(key, stored.slice(0, -1) + last)).toBeNull();
    expect(decryptString(key, 'klartext')).toBeNull();
  });

  it('verlangt korrekte Schlüssel- und Nonce-Längen', () => {
    expect(() => encryptString(new Uint8Array(16), 'x', nonce)).toThrow();
    expect(() => encryptString(key, 'x', new Uint8Array(8))).toThrow();
  });
});

describe('UTF-8 ohne TextEncoder', () => {
  it('entspricht TextEncoder/TextDecoder für Deutsch, Vietnamesisch und Emoji', () => {
    const text = 'Grüße – Hương học tiếng Đức 🎉 ✓';
    expect(Array.from(utf8Encode(text))).toEqual(Array.from(new TextEncoder().encode(text)));
    expect(utf8Decode(new TextEncoder().encode(text))).toBe(text);
  });
});

describe('Kompatibilität gespeicherter Daten', () => {
  it('liest Werte, die mit @noble/ciphers 1.x verschlüsselt wurden (bestehende Sitzungen bleiben gültig)', () => {
    const fromV1 =
      'enc1:010101010101010101010101:0dc3e7d8e4dace34f39c1a91b6961e568893f54f95f41b67b98ad21644c908c812874af92c79284d9b5412579762';
    expect(decryptString(key, fromV1)).toBe('{"note":"Hương học tốt"}');
    expect(encryptString(key, '{"note":"Hương học tốt"}', nonce)).toBe(fromV1);
  });
});
