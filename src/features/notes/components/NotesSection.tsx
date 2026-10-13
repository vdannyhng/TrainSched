import Ionicons from '@expo/vector-icons/Ionicons';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, FormMessage, MarkdownText, SwitchRow, TextField } from '@/components/ui';
import { confirmAsync } from '@/lib/confirm';
import { errorKey } from '@/lib/errors';
import { MIN_TOUCH, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { useCreateNote, useDeleteNote, useNotes, type Note, type NoteTarget } from '../api';

type Props = {
  target: NoteTarget;
  /** Lehrer des Termins/Schülers – ohne ihn ist der Abschnitt nur lesbar (Schüleransicht). */
  teacherId?: string;
  /** Sichtbarkeit neuer Notizen vorbelegen */
  defaultVisibleForStudent?: boolean;
};

/** Notizen zu einem Termin oder Schüler: schreiben (Markdown light), lesen, löschen. */
export function NotesSection({ target, teacherId, defaultVisibleForStudent = false }: Props) {
  const { t } = useTranslation();
  const notes = useNotes(target);
  const editable = !!teacherId;

  return (
    <Card title={t('notes.title')}>
      {editable ? (
        <NoteComposer
          target={target}
          teacherId={teacherId}
          defaultVisibleForStudent={defaultVisibleForStudent}
        />
      ) : null}
      {notes.isError ? <FormMessage message={t('errors.loadFailed')} /> : null}
      {notes.data?.length === 0 ? <AppText tone="muted">{t('notes.empty')}</AppText> : null}
      {notes.data?.map((note) => (
        <NoteItem key={note.id} note={note} editable={editable} />
      ))}
    </Card>
  );
}

export function NoteComposer({
  target,
  teacherId,
  defaultVisibleForStudent = false,
  onSaved,
  autoFocus,
}: {
  target: NoteTarget;
  teacherId: string;
  defaultVisibleForStudent?: boolean;
  onSaved?: () => void;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const create = useCreateNote(target, teacherId);
  const [body, setBody] = useState('');
  const [visibleForStudent, setVisibleForStudent] = useState(defaultVisibleForStudent);

  return (
    <View style={styles.composer}>
      <TextField
        label={t('notes.title')}
        placeholder={t('notes.placeholder')}
        hint={t('notes.formatHint')}
        value={body}
        onChangeText={setBody}
        multiline
        autoFocus={autoFocus}
        style={styles.input}
      />
      <SwitchRow
        label={t('notes.visibleForStudent')}
        value={visibleForStudent}
        onValueChange={setVisibleForStudent}
      />
      <FormMessage message={create.error ? t(errorKey(create.error)) : undefined} />
      <Button
        title={t('notes.add')}
        variant="secondary"
        disabled={!body.trim()}
        loading={create.isPending}
        onPress={() =>
          create.mutate(
            { body, visibility: visibleForStudent ? 'student' : 'teacher' },
            {
              onSuccess: () => {
                setBody('');
                onSaved?.();
              },
            },
          )
        }
      />
    </View>
  );
}

function NoteItem({ note, editable }: { note: Note; editable: boolean }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const remove = useDeleteNote();
  return (
    <View style={[styles.note, { borderColor: colors.border }]}>
      <View style={styles.noteHeader}>
        {editable ? (
          <Ionicons
            name={note.visibility === 'student' ? 'eye-outline' : 'lock-closed-outline'}
            size={16}
            color={colors.textMuted}
            accessibilityElementsHidden
          />
        ) : null}
        <AppText variant="caption" tone="muted" style={styles.flex}>
          {DateTime.fromISO(note.created_at).setLocale(i18n.language).toLocaleString(DateTime.DATETIME_MED)}
          {editable
            ? ` · ${note.visibility === 'student' ? t('notes.visibleForStudent') : t('notes.teacherOnly')}`
            : ''}
        </AppText>
        {editable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
            hitSlop={8}
            style={styles.iconButton}
            onPress={async () => {
              const ok = await confirmAsync({
                title: t('notes.deleteTitle'),
                confirmLabel: t('common.delete'),
                cancelLabel: t('common.cancel'),
                destructive: true,
              });
              if (ok) remove.mutate(note.id);
            }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        ) : null}
      </View>
      <MarkdownText text={note.body} />
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { gap: spacing.sm },
  input: { minHeight: 96, textAlignVertical: 'top' },
  note: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: spacing.xs },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  iconButton: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
