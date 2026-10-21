import 'expo-sqlite/localStorage/install';

import { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { decryptString, encryptString, isEncrypted } from './cipher';

/**
 * Verschlüsselter Speicher für Sitzung und Offline-Cache (MASVS-STORAGE).
 * Native: Schlüssel im iOS-Keychain bzw. Android-Keystore (expo-secure-store), Daten AES-GCM-verschlüsselt
 * im expo-sqlite-Speicher (SecureStore selbst ist für grosse Werte nicht geeignet).
 * Web: Browser-localStorage unverschlüsselt – es gibt dort keinen sicheren Schlüsselspeicher.
 */
const KEY_NAME = 'trainsched.storage-key.v1';
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

let keyPromise: Promise<Uint8Array> | null = null;

function storageKey(): Promise<Uint8Array> {
  keyPromise ??= (async () => {
    const existing = await SecureStore.getItemAsync(KEY_NAME);
    if (existing) return hexToBytes(existing);
    const key = Crypto.getRandomBytes(32);
    await SecureStore.setItemAsync(KEY_NAME, bytesToHex(key), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    return key;
  })().catch((e: unknown) => {
    keyPromise = null;
    throw e;
  });
  return keyPromise;
}

export const encryptedStorage = {
  async getItem(name: string): Promise<string | null> {
    const raw = localStorage.getItem(name);
    if (raw === null || !isNative) return raw;
    // Altbestand aus der Zeit vor der Verschlüsselung: einmal lesen, beim nächsten Schreiben verschlüsselt
    if (!isEncrypted(raw)) return raw;
    return decryptString(await storageKey(), raw);
  },
  async setItem(name: string, value: string): Promise<void> {
    if (!isNative) {
      localStorage.setItem(name, value);
      return;
    }
    localStorage.setItem(name, encryptString(await storageKey(), value, Crypto.getRandomBytes(12)));
  },
  async removeItem(name: string): Promise<void> {
    localStorage.removeItem(name);
  },
};
