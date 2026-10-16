// Versendet fällige Einträge aus notification_outbox über den Expo Push Service.
// Aufruf nur durch die Datenbank (pg_net) mit gemeinsamem Secret – nie aus der App.
import { createClient } from '@supabase/supabase-js';

import { renderPush, type PushRow } from '../_shared/pushText.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;

type ClaimedRow = PushRow & { id: number; tokens: string[] };
type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data: { url: string };
  sound: 'default';
  channelId: 'default';
};
type ExpoTicket =
  { status: 'ok'; id: string } | { status: 'error'; message: string; details?: { error?: string } };

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sendChunk(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(messages) });
  if (!res.ok) throw new Error(`expo_http_${res.status}`);
  const json = (await res.json()) as { data?: ExpoTicket[] };
  return json.data ?? [];
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('PUSH_DISPATCH_SECRET');
  if (!secret || !timingSafeEqual(req.headers.get('x-dispatch-secret') ?? '', secret)) {
    return new Response('forbidden', { status: 403 });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc('claim_push_batch', { p_limit: 200 });
  if (error) {
    console.error('claim_push_batch', error);
    return new Response('error', { status: 500 });
  }
  const rows = (data ?? []) as ClaimedRow[];

  // Ein Eintrag → eine Nachricht pro Gerät des Empfängers
  const messages: { rowId: number; message: ExpoMessage }[] = [];
  const noDevice: number[] = [];
  for (const row of rows) {
    if (!row.tokens.length) {
      noDevice.push(row.id);
      continue;
    }
    const { title, body, url } = renderPush(row);
    for (const to of row.tokens) {
      messages.push({
        rowId: row.id,
        message: { to, title, body, data: { url }, sound: 'default', channelId: 'default' },
      });
    }
  }

  const sent = new Set<number>();
  const failed = new Map<number, string>();
  const deadTokens: string[] = [];

  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    try {
      const tickets = await sendChunk(chunk.map((m) => m.message));
      tickets.forEach((ticket, j) => {
        const item = chunk[j]!;
        if (ticket.status === 'ok') sent.add(item.rowId);
        else if (ticket.details?.error === 'DeviceNotRegistered') deadTokens.push(item.message.to);
        else failed.set(item.rowId, ticket.details?.error ?? ticket.message);
      });
    } catch (e) {
      for (const item of chunk) failed.set(item.rowId, String(e));
    }
  }

  // Mindestens ein Gerät erreicht → erledigt. Abgemeldete Geräte zählen ebenfalls als erledigt.
  const done = rows.map((r) => r.id).filter((id) => sent.has(id) || noDevice.includes(id) || !failed.has(id));
  const now = new Date().toISOString();
  if (done.length) {
    const { error: e } = await admin
      .from('notification_outbox')
      .update({ sent_at: now, last_error: null })
      .in('id', done);
    if (e) console.error('mark sent', e);
  }
  for (const [id, message] of failed) {
    if (sent.has(id)) continue;
    // claimed_at bleibt gesetzt → nächster Versuch frühestens nach 2 Minuten (max. 5 Versuche)
    const { error: e } = await admin
      .from('notification_outbox')
      .update({ last_error: message.slice(0, 500) })
      .eq('id', id);
    if (e) console.error('mark failed', e);
  }
  if (noDevice.length) {
    await admin.from('notification_outbox').update({ last_error: 'no_device' }).in('id', noDevice);
  }
  if (deadTokens.length) {
    const { error: e } = await admin.from('push_tokens').delete().in('token', deadTokens);
    if (e) console.error('delete tokens', e);
  }

  return new Response(
    JSON.stringify({
      claimed: rows.length,
      sent: sent.size,
      failed: failed.size,
      deadTokens: deadTokens.length,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
