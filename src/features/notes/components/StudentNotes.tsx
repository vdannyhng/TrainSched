import Ionicons from '@expo/vector-icons/Ionicons';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, FormMessage, SwitchRow, TextField } from '@/components/ui';
import { confirmAsync } from '@/lib/confirm';
import { errorKey } from '@/lib/errors';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { useCreateNote, useDeleteNote, useStudentNotes } from '../api';

/** Notizen zum Schüler: schreiben (Standard „nur Lehrer“), Liste, löschen. */
export function StudentNotes({ studentId, teacherId }: { studentId: string; teacherId: string }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const notes = useStudentNotes(studentId);
  const create = useCreateNote(studentId, teacherId);
  const remove = useDeleteNote(studentId);
  const [body, setBody] = useState('');
  const [visibleForStudent, setVisibleForStudent] = useState(false);

  const submit = () => {
    if (!body.trim()) return;
    create.mutate(
      { body, visibility: visibleForStudent ? 'student' : 'teacher' },
      { onSuccess: () => setBody('') },
    );
  };

  return (
    <Card title={t('students.sections.notes')}>
      <TextField
        label={t('students.sections.notes')}
        placeholder={t('students.notes.placeholder')}
        value={body}
        onChangeText={setBody}
        multiline
        style={styles.input}
      />
      <SwitchRow
        label={t('students.notes.visibleForStudent')}
        value={visibleForStudent}
        onValueChange={setVisibleForStudent}
      />
      <FormMessage message={create.error ? t(errorKey(create.error)) : undefined} />
      <Button
        title={t('students.notes.add')}
        variant="secondary"
        disabled={!body.trim()}
        loading={create.isPending}
        onPress={submit}
      />

      {notes.data?.length === 0 ? <AppText tone="muted">{t('students.notes.empty')}</AppText> : null}
      {notes.isError ? <FormMessage message={t('errors.loadFailed')} /> : null}

      {notes.data?.map((note) => (
        <View key={note.id} style={[styles.note, { borderColor: colors.border }]}>
          <View style={styles.noteHeader}>
            <Ionicons
              name={note.visibility === 'student' ? 'eye-outline' : 'lock-closed-outline'}
              size={16}
              color={colors.textMuted}
              accessibilityElementsHidden
            />
            <AppText variant="caption" tone="muted" style={styles.flex}>
              {DateTime.fromISO(note.created_at)
                .setLocale(i18n.language)
                .toLocaleString(DateTime.DATETIME_MED)}
              {' · '}
              {note.visibility === 'student'
                ? t('students.notes.visibleForStudent')
                : t('students.notes.teacherOnly')}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
              hitSlop={8}
              style={styles.iconButton}
              onPress={async () => {
                const ok = await confirmAsync({
                  title: t('students.notes.deleteTitle'),
                  confirmLabel: t('common.delete'),
                  cancelLabel: t('common.cancel'),
                  destructive: true,
                });
                if (ok) remove.mutate(note.id);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
          <AppText selectable>{note.body}</AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 88, textAlignVertical: 'top' },
  note: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: spacing.xs },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  iconButton: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
});
