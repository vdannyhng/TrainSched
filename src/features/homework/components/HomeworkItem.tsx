import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, MarkdownText } from '@/components/ui';
import { confirmAsync } from '@/lib/confirm';
import { formatDayShort } from '@/lib/time';
import { MIN_TOUCH, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { isOverdue, useDeleteHomework, useSetHomeworkStatus, type Homework } from '../api';

type Props = {
  homework: Homework;
  today: string;
  showStudent?: boolean;
  canDelete?: boolean;
};

/** Eine Hausaufgabe mit Abhaken (Schüler und Lehrer), optional Löschen (Lehrer). */
export function HomeworkItem({ homework: h, today, showStudent, canDelete }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const setStatus = useSetHomeworkStatus();
  const remove = useDeleteHomework();
  const done = h.status === 'done';
  const overdue = isOverdue(h, today);

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, busy: setStatus.isPending }}
        accessibilityLabel={`${h.title}: ${done ? t('homework.markOpen') : t('homework.markDone')}`}
        disabled={setStatus.isPending}
        onPress={() => setStatus.mutate({ id: h.id, done: !done })}
        style={styles.check}
      >
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={done ? colors.success : colors.textMuted}
        />
      </Pressable>
      <View style={styles.body}>
        <AppText variant="bodyStrong" style={done && styles.done}>
          {showStudent && h.student ? `${h.student.first_name}: ` : ''}
          {h.title}
        </AppText>
        {h.description ? <MarkdownText text={h.description} /> : null}
        {h.due_date ? (
          <AppText variant="caption" tone={overdue ? 'danger' : 'muted'}>
            {overdue
              ? t('homework.overdue', { date: formatDayShort(h.due_date, i18n.language) })
              : t('homework.due', { date: formatDayShort(h.due_date, i18n.language) })}
          </AppText>
        ) : null}
      </View>
      {canDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('common.delete')}: ${h.title}`}
          style={styles.check}
          onPress={async () => {
            const ok = await confirmAsync({
              title: t('homework.deleteTitle'),
              confirmLabel: t('common.delete'),
              cancelLabel: t('common.cancel'),
              destructive: true,
            });
            if (ok) remove.mutate(h.id);
          }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  check: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2, paddingTop: spacing.sm },
  done: { textDecorationLine: 'line-through', opacity: 0.7 },
});
