import { FunctionsHttpError } from '@supabase/supabase-js';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type DeleteAccountError = 'admin_cannot_delete' | 'not_found' | 'server_error';

export class DeleteAccountFailure extends Error {
  constructor(readonly code: DeleteAccountError) {
    super(code);
  }
}

/**
 * Ohne `studentId`: eigenes Konto löschen. Mit `studentId`: Schüler komplett löschen
 * (Datensatz, Dateien, App-Login). Die Rechte prüft der Server.
 */
export async function deleteAccount(studentId?: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    body: studentId ? { studentId } : {},
  });
  if (!error) return;
  let code: DeleteAccountError = 'server_error';
  if (error instanceof FunctionsHttpError) {
    const payload = (await error.context.json().catch(() => null)) as { error?: DeleteAccountError } | null;
    if (payload?.error === 'admin_cannot_delete' || payload?.error === 'not_found') code = payload.error;
  }
  throw new DeleteAccountFailure(code);
}

type ExportAttachment = { storage_path: string; download_url?: string | null };

const LINK_VALIDITY_SECONDS = 7 * 24 * 3600;

/** Alle eigenen Daten als JSON (inkl. 7 Tage gültiger Download-Links zu den Anhängen). */
export async function buildExport(): Promise<string> {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw error;
  const exported = data as { attachments: ExportAttachment[] } & Record<string, unknown>;

  const paths = exported.attachments.map((a) => a.storage_path);
  if (paths.length) {
    const { data: links } = await supabase.storage
      .from('attachments')
      .createSignedUrls(paths, LINK_VALIDITY_SECONDS);
    const byPath = new Map((links ?? []).map((l) => [l.path, l.signedUrl]));
    exported.attachments = exported.attachments.map((a) => ({
      ...a,
      download_url: byPath.get(a.storage_path) ?? null,
    }));
  }
  return JSON.stringify(exported, null, 2);
}

/** Export erzeugen und teilen (Web: Download). */
export async function shareExport(): Promise<void> {
  const content = await buildExport();
  const fileName = `trainsched-export-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
}
