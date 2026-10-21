// Konto bzw. Schüler endgültig löschen: Datenzeilen, Dateien im Storage und Logins.
// Was gelöscht werden darf, entscheidet account_deletion_plan() – aufgerufen mit dem JWT des Nutzers.
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Plan = {
  mode: 'student_self' | 'student' | 'teacher_self';
  student_ids: string[];
  user_ids: string[];
  teacher_folder: string | null;
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'invalid_input' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'forbidden' }, 401);
  const body = (await req.json().catch(() => ({}))) as { studentId?: unknown };
  const studentId = typeof body.studentId === 'string' ? body.studentId : null;
  if (studentId && !UUID.test(studentId)) return json({ error: 'invalid_input' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error: planError } = await asUser.rpc('account_deletion_plan', { p_student_id: studentId });
  if (planError) {
    if (planError.message === 'admin_cannot_delete') return json({ error: 'admin_cannot_delete' }, 400);
    if (planError.code === 'P0002' || planError.code === '42501') return json({ error: 'not_found' }, 404);
    console.error('account_deletion_plan', planError);
    return json({ error: 'server_error' }, 500);
  }
  const plan = data as Plan;
  const { data: caller } = await asUser.auth.getUser();
  const actorId = caller.user?.id ?? null;

  async function removeFiles(onlyOrphans: boolean) {
    if (!plan.teacher_folder) return;
    const { data: paths, error } = await admin.rpc('attachment_objects', {
      p_teacher_id: plan.teacher_folder,
      p_only_orphans: onlyOrphans,
    });
    if (error) throw error;
    const list = (paths ?? []) as string[];
    for (let i = 0; i < list.length; i += 100) {
      const { error: e } = await admin.storage.from('attachments').remove(list.slice(i, i + 100));
      if (e) throw e;
    }
  }

  // Admin-Protokoll: wer hat welches Konto gelöscht (vor dem Löschen, damit der Auslöser feststeht)
  async function auditDeletions() {
    if (!plan.user_ids.length) return;
    const { error } = await admin.from('audit_log').insert(
      plan.user_ids.map((id) => ({
        actor_id: actorId,
        action: 'account_deleted',
        target_type: 'profile',
        target_id: id,
        details: { mode: plan.mode },
      })),
    );
    if (error) throw error;
  }

  async function deleteUsers() {
    for (const id of plan.user_ids) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error && error.status !== 404) throw error;
    }
  }

  try {
    await auditDeletions();
    if (plan.mode === 'student') {
      // Datensatz zuerst (Termine/Notizen/Anhänge kaskadieren), dann verwaiste Dateien, dann das Login.
      // Mit den Rechten des Nutzers löschen → das Protokoll kennt den Auslöser (RLS erlaubt es laut Plan).
      const { error } = await asUser.from('students').delete().in('id', plan.student_ids);
      if (error) throw error;
      await removeFiles(true);
      await deleteUsers();
    } else if (plan.mode === 'teacher_self') {
      await removeFiles(false);
      await deleteUsers(); // Schüler-Logins, zuletzt das eigene (kaskadiert alle Daten der Lehrkraft)
    } else {
      await deleteUsers();
    }
  } catch (e) {
    console.error('delete-account', plan.mode, e);
    return json({ error: 'server_error' }, 500);
  }

  return json({ ok: true, mode: plan.mode }, 200);
});
