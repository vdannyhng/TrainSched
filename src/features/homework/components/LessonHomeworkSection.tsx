import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chip, ChipRow, FormMessage, TextField } from '@/components/ui';
import type { Lesson } from '@/features/lessons/api';
import { DateField } from '@/features/lessons/components/DateField';
import { errorKey } from '@/lib/errors';
import { spacing } from '@/theme/tokens';

import { useCreateHomework, useLessonHomework } from '../api';
import { HomeworkItem } from './HomeworkItem';

/** Hausaufgaben am Termin: anlegen (für ausgewählte Teilnehmende), Status sehen, löschen. */
export function LessonHomeworkSection({ lesson, today }: { lesson: Lesson; today: string }) {
  const { t } = useTranslation();
  const homework = useLessonHomework(lesson.id);
  const create = useCreateHomework();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const allIds = lesson.participants.map((p) => p.student_id);
  const [studentIds, setStudentIds] = useState<string[]>(allIds);
  const isGroup = allIds.length > 1;

  const reset = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setStudentIds(allIds);
    setOpen(false);
  };

  return (
    <Card title={t('homework.title')}>
      {open ? (
        <View style={styles.form}>
          <TextField
            label={t('homework.fields.title')}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            autoFocus
          />
          <TextField
            label={t('homework.fields.description')}
            hint={t('notes.formatHint')}
            value={description}
            onChangeText={setDescription}
            multiline
            style={styles.multiline}
          />
          <DateField
            label={t('homework.fields.dueDate')}
            value={dueDate}
            today={today}
            onChange={setDueDate}
            onClear={() => setDueDate('')}
            placeholder="–"
          />
          {isGroup ? (
            <View style={styles.form}>
              <AppText variant="label">{t('homework.fields.for')}</AppText>
              <ChipRow>
                {lesson.participants.map((p) => {
                  const selected = studentIds.includes(p.student_id);
                  return (
                    <Chip
                      key={p.student_id}
                      label={p.student?.first_name ?? '…'}
                      selected={selected}
                      onPress={() =>
                        setStudentIds((ids) =>
                          selected ? ids.filter((id) => id !== p.student_id) : [...ids, p.student_id],
                        )
                      }
                    />
                  );
                })}
              </ChipRow>
            </View>
          ) : null}
          <FormMessage message={create.error ? t(errorKey(create.error)) : undefined} />
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button title={t('common.cancel')} variant="secondary" onPress={reset} />
            </View>
            <View style={styles.flex}>
              <Button
                title={t('homework.save')}
                disabled={!title.trim() || studentIds.length === 0}
                loading={create.isPending}
                onPress={() =>
                  create.mutate(
                    {
                      teacherId: lesson.teacher_id,
                      lessonId: lesson.id,
                      studentIds,
                      title,
                      description,
                      dueDate: dueDate || null,
                    },
                    { onSuccess: reset },
                  )
                }
              />
            </View>
          </View>
        </View>
      ) : (
        <Button title={t('homework.add')} variant="secondary" onPress={() => setOpen(true)} />
      )}

      {homework.data?.length === 0 && !open ? <AppText tone="muted">{t('homework.empty')}</AppText> : null}
      {homework.data?.map((h) => (
        <HomeworkItem key={h.id} homework={h} today={today} showStudent={isGroup} canDelete />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
