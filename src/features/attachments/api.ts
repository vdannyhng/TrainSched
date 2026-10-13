import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

import type { NoteTarget, NoteVisibility } from '../notes/api';

export type Attachment = Pick<
  Tables<'attachments'>,
  | 'id'
  | 'teacher_id'
  | 'lesson_id'
  | 'student_id'
  | 'visibility'
  | 'storage_path'
  | 'original_name'
  | 'mime_type'
  | 'size_bytes'
  | 'created_at'
>;

const BUCKET = 'attachments';
export const MAX_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 1600;

export const attachmentKeys = {
  all: ['attachments'] as const,
  target: (t: NoteTarget) =>
    ['attachments', t.lessonId ? 'lesson' : 'student', t.lessonId ?? t.studentId] as const,
  mine: ['attachments', 'mine'] as const,
};

const COLUMNS =
  'id, teacher_id, lesson_id, student_id, visibility, storage_path, original_name, mime_type, size_bytes, created_at';

export function useAttachments(target: NoteTarget) {
  return useQuery({
    queryKey: attachmentKeys.target(target),
    queryFn: async (): Promise<Attachment[]> => {
      let query = supabase.from('attachments').select(COLUMNS).order('created_at', { ascending: false });
      query = target.lessonId
        ? query.eq('lesson_id', target.lessonId)
        : query.eq('student_id', target.studentId!);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/** Für Schüler: alle für sie freigegebenen Dateien (RLS filtert). */
export function useMyAttachments(enabled: boolean) {
  return useQuery({
    queryKey: attachmentKeys.mine,
    enabled,
    queryFn: async (): Promise<Attachment[]> => {
      const { data, error } = await supabase
        .from('attachments')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Auswahl (Kamera / Galerie / Datei) → vereinheitlichtes Objekt
// ---------------------------------------------------------------------------
export type PickedFile = { uri: string; name: string; mimeType: string; size: number; webFile?: Blob };

export class AttachmentError extends Error {
  constructor(public readonly reason: 'permission' | 'too_large' | 'unsupported') {
    super(reason);
  }
}

const ALLOWED = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf|audio\/.+)$/;

async function compressImage(uri: string, width: number | undefined): Promise<{ uri: string; size: number }> {
  const context = ImageManipulator.manipulate(uri);
  if (!width || width > MAX_IMAGE_WIDTH) context.resize({ width: MAX_IMAGE_WIDTH });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  const size =
    Platform.OS === 'web' ? (await (await fetch(result.uri)).blob()).size : new File(result.uri).size;
  return { uri: result.uri, size };
}

/** Foto aus Kamera oder Galerie, vor dem Upload verkleinert (max. 1600 px, JPEG 70 %). */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedFile | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new AttachmentError('permission');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const compressed = await compressImage(asset.uri, asset.width);
  const base = (asset.fileName ?? `foto-${Date.now()}`).replace(/\.[^.]+$/, '');
  return { uri: compressed.uri, name: `${base}.jpg`, mimeType: 'image/jpeg', size: compressed.size };
}

/** PDF, Audio oder Bild aus den Dateien. */
export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'audio/*', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const mimeType = asset.mimeType ?? 'application/octet-stream';
  if (!ALLOWED.test(mimeType)) throw new AttachmentError('unsupported');
  if (mimeType.startsWith('image/') && mimeType !== 'image/heic') {
    const compressed = await compressImage(asset.uri, undefined);
    return {
      uri: compressed.uri,
      name: asset.name.replace(/\.[^.]+$/, '') + '.jpg',
      mimeType: 'image/jpeg',
      size: compressed.size,
    };
  }
  const size = asset.size ?? 0;
  if (size > MAX_BYTES) throw new AttachmentError('too_large');
  return { uri: asset.uri, name: asset.name, mimeType, size, webFile: asset.file };
}

// ---------------------------------------------------------------------------
// Hochladen / Löschen / Öffnen
// ---------------------------------------------------------------------------
function safeFileName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .slice(-80) || 'datei'
  );
}

async function readBody(file: PickedFile): Promise<ArrayBuffer | Blob> {
  if (Platform.OS === 'web') return file.webFile ?? (await (await fetch(file.uri)).blob());
  return new File(file.uri).arrayBuffer();
}

export function useUploadAttachment(target: NoteTarget, teacherId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, visibility }: { file: PickedFile; visibility: NoteVisibility }) => {
      if (file.size > MAX_BYTES) throw new AttachmentError('too_large');
      const path = `${teacherId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, await readBody(file), { contentType: file.mimeType, upsert: false });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('attachments').insert({
        teacher_id: teacherId!,
        lesson_id: target.lessonId ?? null,
        student_id: target.studentId ?? null,
        visibility,
        storage_path: path,
        original_name: file.name.slice(0, 200),
        mime_type: file.mimeType,
        size_bytes: Math.max(1, file.size),
      });
      if (error) {
        // Datei ohne Metadaten wäre verwaist → wieder entfernen
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attachmentKeys.all }),
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (a: Attachment) => {
      // Erst die Datei, dann den Eintrag – sonst bliebe bei einem Fehler eine verwaiste Datei zurück
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([a.storage_path]);
      if (storageError) throw storageError;
      const { error } = await supabase.from('attachments').delete().eq('id', a.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attachmentKeys.all }),
  });
}

/** Zeitlich begrenzter Link (1 Std.) – nur für Berechtigte (Storage-RLS). */
export function useSignedUrl(path: string | null) {
  return useQuery({
    queryKey: ['attachments', 'url', path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export async function openAttachment(a: Attachment): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.storage_path, 3600);
  if (error) throw error;
  if (Platform.OS === 'web') window.open(data.signedUrl, '_blank', 'noopener');
  else await WebBrowser.openBrowserAsync(data.signedUrl);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
