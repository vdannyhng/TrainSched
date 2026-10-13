import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, FormMessage, SwitchRow } from '@/components/ui';
import type { NoteTarget } from '@/features/notes/api';
import { confirmAsync } from '@/lib/confirm';
import { errorKey } from '@/lib/errors';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import {
  AttachmentError,
  formatBytes,
  openAttachment,
  pickDocument,
  pickPhoto,
  useAttachments,
  useDeleteAttachment,
  useSignedUrl,
  useUploadAttachment,
  type Attachment,
  type PickedFile,
} from '../api';

type Props = {
  target: NoteTarget;
  /** Ohne teacherId nur lesend (Schüleransicht) */
  teacherId?: string;
};

/** Anhänge: Foto aus Kamera/Galerie (komprimiert), PDF/Audio; Öffnen über zeitlich begrenzte Links. */
export function AttachmentsSection({ target, teacherId }: Props) {
  const { t } = useTranslation();
  const attachments = useAttachments(target);
  const upload = useUploadAttachment(target, teacherId);
  const [visibleForStudent, setVisibleForStudent] = useState(true);
  const [pickError, setPickError] = useState<string | null>(null);
  const editable = !!teacherId;

  const add = async (pick: () => Promise<PickedFile | null>) => {
    setPickError(null);
    try {
      const file = await pick();
      if (file) upload.mutate({ file, visibility: visibleForStudent ? 'student' : 'teacher' });
    } catch (e) {
      setPickError(e instanceof AttachmentError ? t(`attachments.errors.${e.reason}`) : t(errorKey(e)));
    }
  };

  const items = attachments.data ?? [];
  if (!editable && items.length === 0) return null;

  return (
    <Card title={t('attachments.title')}>
      {editable ? (
        <>
          <View style={styles.actions}>
            {Platform.OS !== 'web' ? (
              <View style={styles.flex}>
                <Button
                  title={t('attachments.camera')}
                  variant="secondary"
                  onPress={() => void add(() => pickPhoto('camera'))}
                />
              </View>
            ) : null}
            <View style={styles.flex}>
              <Button
                title={t('attachments.library')}
                variant="secondary"
                onPress={() => void add(() => pickPhoto('library'))}
              />
            </View>
          </View>
          <Button title={t('attachments.file')} variant="secondary" onPress={() => void add(pickDocument)} />
          <SwitchRow
            label={t('notes.visibleForStudent')}
            value={visibleForStudent}
            onValueChange={setVisibleForStudent}
          />
          {upload.isPending ? (
            <View style={styles.row}>
              <ActivityIndicator />
              <AppText tone="muted">{t('attachments.uploading')}</AppText>
            </View>
          ) : null}
          <FormMessage
            message={
              pickError ??
              (upload.error
                ? upload.error instanceof AttachmentError
                  ? t(`attachments.errors.${upload.error.reason}`)
                  : t(errorKey(upload.error))
                : undefined)
            }
          />
          {items.length === 0 ? <AppText tone="muted">{t('attachments.empty')}</AppText> : null}
        </>
      ) : null}
      {items.map((a) => (
        <AttachmentRow key={a.id} attachment={a} editable={editable} />
      ))}
    </Card>
  );
}

export function AttachmentRow({ attachment: a, editable }: { attachment: Attachment; editable: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const remove = useDeleteAttachment();
  const isImage = a.mime_type.startsWith('image/');
  const thumb = useSignedUrl(isImage ? a.storage_path : null);
  const icon =
    a.mime_type === 'application/pdf'
      ? 'document-text-outline'
      : a.mime_type.startsWith('audio/')
        ? 'musical-notes-outline'
        : 'image-outline';
  const [openError, setOpenError] = useState(false);

  return (
    <View style={[styles.item, { borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('common.open')}: ${a.original_name}`}
        onPress={() => openAttachment(a).catch(() => setOpenError(true))}
        style={styles.main}
      >
        {isImage && thumb.data ? (
          <Image
            source={{ uri: thumb.data }}
            style={styles.thumb}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.thumb, styles.iconBox, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name={icon} size={24} color={colors.primary} />
          </View>
        )}
        <View style={styles.flex}>
          <AppText numberOfLines={1}>{a.original_name}</AppText>
          <AppText variant="caption" tone="muted">
            {formatBytes(a.size_bytes)}
            {editable
              ? ` · ${a.visibility === 'student' ? t('notes.visibleForStudent') : t('notes.teacherOnly')}`
              : ''}
          </AppText>
          {openError ? (
            <AppText variant="caption" tone="danger">
              {t('errors.generic')}
            </AppText>
          ) : null}
        </View>
      </Pressable>
      {editable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('common.delete')}: ${a.original_name}`}
          style={styles.iconButton}
          onPress={async () => {
            const ok = await confirmAsync({
              title: t('attachments.deleteTitle', { name: a.original_name }),
              confirmLabel: t('common.delete'),
              cancelLabel: t('common.cancel'),
              destructive: true,
            });
            if (ok) remove.mutate(a);
          }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH },
  thumb: { width: 48, height: 48, borderRadius: radius.sm },
  iconBox: { alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
