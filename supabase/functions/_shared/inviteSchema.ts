// Gemeinsam genutzt von App (Formular) und Edge Function `accept-invite`.
// Nur relative Imports und `zod` verwenden, damit Metro und Deno die Datei laden können.
import { z } from 'zod';

const INVITE_ALPHABET = /^[A-HJ-NP-Z2-9]{8}$/;

/** Entfernt Leerzeichen/Bindestriche und wandelt in Grossbuchstaben um. */
export function normalizeInviteCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** Darstellung für Menschen: ABCD-EFGH */
export function formatInviteCode(code: string): string {
  const normalized = normalizeInviteCode(code);
  return normalized.length === 8 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
}

export const inviteCodeSchema = z
  .string()
  .transform(normalizeInviteCode)
  .refine((code) => INVITE_ALPHABET.test(code), { message: 'invalid_code' });

export const passwordSchema = z
  .string()
  .min(8, { message: 'password_too_short' })
  .max(72, { message: 'password_too_long' })
  .refine((pw) => /[A-Za-z]/.test(pw) && /\d/.test(pw), { message: 'password_letters_digits' });

export const acceptInviteSchema = z.object({
  code: inviteCodeSchema,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: 'invalid_email' })),
  password: passwordSchema,
});

export type AcceptInviteInput = z.input<typeof acceptInviteSchema>;

export type AcceptInviteErrorCode =
  'invalid_input' | 'invalid_code' | 'email_taken' | 'rate_limited' | 'server_error';
