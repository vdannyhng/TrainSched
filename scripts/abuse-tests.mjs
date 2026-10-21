// Missbrauchstests (SDLC Gate G2): echte API-Aufrufe gegen die lokale Supabase als fremde Lehrkraft,
// Schüler und anonym. Jeder Versuch, fremde Daten zu lesen, zu ändern oder zu löschen, muss scheitern.
//
// Voraussetzung: `supabase start` + Seed (supabase/seed.sql) + `supabase functions serve`.
// Aufruf: npm run test:abuse   (liest URL und Publishable Key aus `supabase status`, falls nicht gesetzt)
import { execSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

function localConfig() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_KEY };
  }
  const env = Object.fromEntries(
    execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
  return { url: env.API_URL, key: env.PUBLISHABLE_KEY ?? env.ANON_KEY };
}

const { url: URL_, key: KEY } = localConfig();
const PASSWORD = 'Lernen2026';
const LAN = '11111111-1111-1111-1111-111111111111';
const HUONG_STUDENT = '33333333-3333-3333-3333-333333333331';

let failures = 0;
let passed = 0;
function check(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}${detail ? ` – ${detail}` : ''}`);
  }
}

const newClient = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function as(email) {
  const c = newClient();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Login ${email}: ${error.message}`);
  return c;
}
const denied = (res) =>
  !!res.error || (Array.isArray(res.data) && res.data.length === 0) || res.data === null;
const fn = (path, init) => fetch(`${URL_}/functions/v1/${path}`, init);

// ---------------------------------------------------------------- Fixtures (als Lan, Admin/Lehrerin)
const lan = await as('lehrerin@trainsched.test');
const stamp = Date.now();
const start = new Date(Date.UTC(2031, 0, 1 + (stamp % 300), 6, stamp % 60));
const { data: lessonId, error: lessonError } = await lan.rpc('create_lesson', {
  p_teacher_id: LAN,
  p_start_at: start.toISOString(),
  p_end_at: new Date(start.getTime() + 3600_000).toISOString(),
  p_timezone: 'Europe/Zurich',
  p_title: `Abuse-Test ${stamp}`,
  p_format: 'online',
  p_location: null,
  p_meeting_url: null,
  p_level: null,
  p_student_ids: [HUONG_STUDENT],
  p_tag_ids: [],
});
if (lessonError) throw lessonError;
const { data: notes, error: noteError } = await lan
  .from('notes')
  .insert([
    { teacher_id: LAN, lesson_id: lessonId, body: 'Nur für Lehrkraft', visibility: 'teacher' },
    { teacher_id: LAN, lesson_id: lessonId, body: 'Für Hương', visibility: 'student' },
  ])
  .select('id, visibility');
if (noteError) throw noteError;
const teacherNote = notes.find((n) => n.visibility === 'teacher').id;
const filePath = `${LAN}/abuse-${stamp}.pdf`;
{
  const { error } = await lan.storage
    .from('attachments')
    .upload(filePath, new Blob(['%PDF-1.4 abuse'], { type: 'application/pdf' }), {
      contentType: 'application/pdf',
    });
  if (error) throw error;
  const { error: e2 } = await lan.from('attachments').insert({
    teacher_id: LAN,
    lesson_id: lessonId,
    visibility: 'teacher',
    storage_path: filePath,
    original_name: 'intern.pdf',
    mime_type: 'application/pdf',
    size_bytes: 14,
  });
  if (e2) throw e2;
}

try {
  // -------------------------------------------------------------- Fremde Lehrkraft
  console.log('Fremde Lehrkraft (Thomas) gegen Daten von Lan:');
  const thomas = await as('lehrer@trainsched.test');
  check('liest den Termin nicht', denied(await thomas.from('lessons').select('id').eq('id', lessonId)));
  check('liest die Notizen nicht', denied(await thomas.from('notes').select('id').eq('lesson_id', lessonId)));
  check('liest Lans Schüler nicht', denied(await thomas.from('students').select('id').eq('teacher_id', LAN)));
  await thomas.from('lessons').update({ title: 'gehackt' }).eq('id', lessonId);
  await thomas.from('notes').delete().eq('id', teacherNote);
  const after = await lan.from('lessons').select('title, notes(id)').eq('id', lessonId).single();
  check('kann den Termin nicht ändern', after.data?.title === `Abuse-Test ${stamp}`);
  check('kann die Notiz nicht löschen', after.data?.notes.length === 2);
  check(
    'kann keine Notiz in Lans Termin schreiben',
    !!(
      await thomas
        .from('notes')
        .insert({ teacher_id: LAN, lesson_id: lessonId, body: 'x', visibility: 'student' })
    ).error,
  );
  check(
    'kann den Termin nicht absagen',
    !!(await thomas.rpc('cancel_lesson', { p_lesson_id: lessonId, p_reason: 'x' })).error,
  );
  check(
    'sieht keinen fremden Fortschritt',
    !!(await thomas.rpc('student_progress', { p_student_id: HUONG_STUDENT })).error,
  );
  check(
    'lädt die Datei nicht herunter',
    !!(await thomas.storage.from('attachments').download(filePath)).error,
  );
  await thomas.storage.from('attachments').remove([filePath]);
  check('kann die Datei nicht löschen', !(await lan.storage.from('attachments').download(filePath)).error);
  const del = await thomas.functions.invoke('delete-account', { body: { studentId: HUONG_STUDENT } });
  check('kann fremde Schüler nicht löschen', !!del.error && del.response?.status === 404);
  const exported = await thomas.rpc('export_my_data');
  check('Export enthält keine fremden Termine', !exported.data.lessons.some((l) => l.id === lessonId));

  // -------------------------------------------------------------- Schülerin von Lan
  console.log('Schülerin (Hương) gegen Lehrer-Daten:');
  const huong = await as('schueler@trainsched.test');
  const hn = await huong.from('notes').select('body').eq('lesson_id', lessonId);
  check('sieht nur die freigegebene Notiz', hn.data?.length === 1 && hn.data[0].body === 'Für Hương');
  check(
    'sieht den internen Anhang nicht',
    denied(await huong.from('attachments').select('id').eq('lesson_id', lessonId)),
  );
  check(
    'lädt die interne Datei nicht herunter',
    !!(await huong.storage.from('attachments').download(filePath)).error,
  );
  await huong.from('lessons').update({ title: 'x' }).eq('id', lessonId);
  check(
    'kann den Termin nicht ändern',
    (await lan.from('lessons').select('title').eq('id', lessonId).single()).data?.title ===
      `Abuse-Test ${stamp}`,
  );
  check(
    'kann keine Notizen schreiben',
    !!(
      await huong
        .from('notes')
        .insert({ teacher_id: LAN, lesson_id: lessonId, body: 'x', visibility: 'student' })
    ).error,
  );
  check(
    'sieht nur den eigenen Schülerdatensatz',
    (await huong.from('students').select('id')).data?.length === 1,
  );
  check(
    'kann sich nicht zur Admin machen',
    !!(
      await huong
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', (await huong.auth.getUser()).data.user.id)
    ).error,
  );
  check(
    'kann keine Push-Tokens direkt schreiben',
    !!(
      await huong
        .from('push_tokens')
        .insert({ token: 'ExponentPushToken[abcdefgh1234]', user_id: LAN, platform: 'ios' })
    ).error,
  );
  check('sieht die Outbox nicht', denied(await huong.from('notification_outbox').select('id')));
  check('kann keine Pushes abholen', !!(await huong.rpc('claim_push_batch', { p_limit: 1 })).error);

  // -------------------------------------------------------------- Schüler einer anderen Lehrkraft
  console.log('Fremder Schüler (Bảo) gegen Termin von Hương:');
  const bao = await as('bao@trainsched.test');
  check('sieht den Termin nicht', denied(await bao.from('lessons').select('id').eq('id', lessonId)));
  check(
    'kann keine Anfrage für fremden Termin stellen',
    !!(
      await bao.rpc('create_lesson_request', {
        p_lesson_id: lessonId,
        p_kind: 'cancel',
        p_message: null,
        p_proposed_starts: [],
      })
    ).error,
  );

  // -------------------------------------------------------------- Anonym
  console.log('Anonym (nur Publishable Key):');
  const anon = newClient();
  for (const table of ['students', 'lessons', 'notes', 'attachments', 'profiles', 'lesson_requests']) {
    check(`liest keine ${table}`, denied(await anon.from(table).select('id').limit(1)));
  }
  check('kann nichts exportieren', !!(await anon.rpc('export_my_data')).error);
  check('sieht keine Dateien', denied(await anon.storage.from('attachments').list(LAN)));
  const headers = { 'Content-Type': 'application/json', apikey: KEY };
  check(
    'send-push ohne Secret → 403',
    (await fn('send-push', { method: 'POST', headers, body: '{}' })).status === 403,
  );
  check(
    'send-push mit falschem Secret → 403',
    (
      await fn('send-push', {
        method: 'POST',
        headers: { ...headers, 'x-dispatch-secret': 'falsch' },
        body: '{}',
      })
    ).status === 403,
  );
  check(
    'delete-account ohne Login → 401',
    (await fn('delete-account', { method: 'POST', headers, body: '{}' })).status === 401,
  );
  const invite = await fn('accept-invite', {
    method: 'POST',
    headers,
    body: JSON.stringify({ code: 'ZZZZ-ZZZZ', email: `abuse-${stamp}@example.com`, password: 'Abc12345' }),
  });
  check(
    'ungültiger Einladungscode wird abgelehnt',
    [400, 429].includes(invite.status),
    `Status ${invite.status}`,
  );
} finally {
  await lan.storage.from('attachments').remove([filePath]);
  await lan.from('lessons').delete().eq('id', lessonId);
}

console.log(`\n${passed} bestanden, ${failures} fehlgeschlagen`);
process.exit(failures ? 1 : 0);
