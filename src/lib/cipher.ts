import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';

/**
 * AES-256-GCM für Daten auf dem Gerät (Sitzung, Offline-Cache).
 * Format: `enc1:<nonce hex>:<ciphertext+tag hex>`. GCM erkennt Manipulationen → decrypt liefert null.
 * Reine Funktionen (Schlüssel und Nonce kommen von aussen) – dadurch in Jest testbar.
 */
export const CIPHER_PREFIX = 'enc1:';

/** UTF-8 ohne TextEncoder/TextDecoder (Hermes kennt TextDecoder nicht zuverlässig). */
export function utf8Encode(text: string): Uint8Array {
  const out: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return Uint8Array.from(out);
}

export function utf8Decode(bytes: Uint8Array): string {
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i]!;
    let cp: number;
    if (b < 0x80) {
      cp = b;
      i += 1;
    } else if (b < 0xe0) {
      cp = ((b & 0x1f) << 6) | (bytes[i + 1]! & 0x3f);
      i += 2;
    } else if (b < 0xf0) {
      cp = ((b & 0x0f) << 12) | ((bytes[i + 1]! & 0x3f) << 6) | (bytes[i + 2]! & 0x3f);
      i += 3;
    } else {
      cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1]! & 0x3f) << 12) |
        ((bytes[i + 2]! & 0x3f) << 6) |
        (bytes[i + 3]! & 0x3f);
      i += 4;
    }
    result += String.fromCodePoint(cp);
  }
  return result;
}

export function encryptString(key: Uint8Array, plaintext: string, nonce: Uint8Array): string {
  if (key.length !== 32) throw new Error('key must be 32 bytes');
  if (nonce.length !== 12) throw new Error('nonce must be 12 bytes');
  const sealed = gcm(key, nonce).encrypt(utf8Encode(plaintext));
  return `${CIPHER_PREFIX}${bytesToHex(nonce)}:${bytesToHex(sealed)}`;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(CIPHER_PREFIX);
}

export function decryptString(key: Uint8Array, stored: string): string | null {
  if (!isEncrypted(stored)) return null;
  const [nonceHex, dataHex] = stored.slice(CIPHER_PREFIX.length).split(':');
  if (!nonceHex || !dataHex) return null;
  try {
    return utf8Decode(gcm(key, hexToBytes(nonceHex)).decrypt(hexToBytes(dataHex)));
  } catch {
    return null;
  }
}
