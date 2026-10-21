// Löst einen Einladungscode ein und legt das Konto an.
// Öffentliche Registrierung ist deaktiviert – nur dieser Weg erzeugt neue Nutzer.
import { createClient } from '@supabase/supabase-js';

import { acceptInviteSchema, type AcceptInviteErrorCode } from '../_shared/inviteSchema.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(error: AcceptInviteErrorCode, status: number): Response {
  return json({ error }, status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('invalid_input', 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Brute-Force-Schutz: jeder Versuch zählt (auch ungültige Eingaben), bevor ein Code geprüft wird
  const client = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { data: allowed, error: limitError } = await admin.rpc('register_invite_attempt', {
    p_client: client,
  });
  if (limitError) {
    console.error('register_invite_attempt', limitError);
    return fail('server_error', 500);
  }
  if (!allowed) return fail('rate_limited', 429);

  const parsed = acceptInviteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('invalid_input', 400);
  const { code, email, password } = parsed.data;

  const { data: invitations, error: findError } = await admin.rpc('find_open_invitation', { p_code: code });
  if (findError) {
    console.error('find_open_invitation', findError);
    return fail('server_error', 500);
  }
  const invitation = invitations?.[0];
  if (!invitation) return fail('invalid_code', 400);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: invitation.role },
    user_metadata: {
      display_name: invitation.display_name,
      timezone: invitation.timezone,
      locale: invitation.locale,
    },
  });
  if (createError || !created.user) {
    const code = createError?.code;
    if (code === 'email_exists' || code === 'user_already_exists') return fail('email_taken', 409);
    if (code === 'weak_password' || code === 'email_address_invalid' || code === 'validation_failed') {
      return fail('invalid_input', 400);
    }
    console.error('createUser', createError);
    return fail('server_error', 500);
  }

  const { data: completed, error: completeError } = await admin.rpc('complete_invitation', {
    p_invitation_id: invitation.invitation_id,
    p_user_id: created.user.id,
  });
  if (completeError || completed !== true) {
    // Wettlauf verloren oder Fehler: angelegtes Konto wieder entfernen.
    await admin.auth.admin.deleteUser(created.user.id);
    if (completeError) console.error('complete_invitation', completeError);
    return fail(completeError ? 'server_error' : 'invalid_code', completeError ? 500 : 409);
  }

  return json({ ok: true, role: invitation.role }, 201);
});
