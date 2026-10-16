import * as Linking from 'expo-linking';
import { FunctionsHttpError } from '@supabase/supabase-js';

import type { AppLocale } from '@/i18n';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

import { unregisterPush } from '../push/push';

import type { AcceptInviteErrorCode } from '../../../supabase/functions/_shared/inviteSchema';
import { AppError, inviteErrorKey } from './errors';
import { acceptInviteSchema, type InviteFormValues, type SignInValues } from './schemas';

export type Profile = Tables<'profiles'>;

/** Version der Datenschutzerklärung – bei inhaltlicher Änderung erhöhen, dann wird erneut gefragt. */
export const PRIVACY_POLICY_VERSION = '2026-10';

export async function signIn(values: SignInValues) {
  const { error } = await supabase.auth.signInWithPassword({
    email: values.email.trim().toLowerCase(),
    password: values.password,
  });
  if (error) throw error;
}

export async function signOut() {
  await unregisterPush();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Löst die Einladung über die Edge Function ein und meldet direkt an. */
export async function acceptInvite(values: InviteFormValues) {
  const body = acceptInviteSchema.parse(values);
  const { error } = await supabase.functions.invoke('accept-invite', { body });
  if (error) {
    let code: AcceptInviteErrorCode | undefined;
    if (error instanceof FunctionsHttpError) {
      const payload = (await error.context.json().catch(() => null)) as {
        error?: AcceptInviteErrorCode;
      } | null;
      code = payload?.error;
    }
    throw new AppError(inviteErrorKey(code));
  }
  await signIn({ email: body.email, password: body.password });
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: Linking.createURL('reset-password'),
  });
  // Antwort immer gleich anzeigen (keine Konto-Enumeration); nur Rate-Limit/Netzwerk durchreichen.
  if (error && (error.status === 429 || error.name === 'AuthRetryableFetchError')) throw error;
}

export async function exchangeRecoveryCode(code: string) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function acceptPrivacyPolicy() {
  const { error } = await supabase.rpc('accept_privacy_policy', { p_version: PRIVACY_POLICY_VERSION });
  if (error) throw error;
}

export async function updateProfileLocale(userId: string, locale: AppLocale) {
  const { error } = await supabase.from('profiles').update({ locale }).eq('id', userId);
  if (error) throw error;
}
