import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, MarkdownText } from '@/components/ui';
import { useLessonHomework } from '@/features/homework/api';
import { useNotes } from '@/features/notes/api';
import { supabase } from '@/lib/supabase';
import { formatDayLong, localDate } from '@/lib/time';

import { useLesson } from '../api';
import { useLocale, useViewerZone } from '../hooks';

function usePreviousLessonId(lessonId: string) {
  return useQuery({
    queryKey: ['lessons', 'previous', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('previous_lesson_id', { p_lesson_id: lessonId });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
}

/** „Letzte Stunde in 1 Minute“: Notizen und Hausaufgaben der vorherigen Stunde auf einen Blick. */
export function PreviousLessonCard({
  lessonId,
  hrefBase,
}: {
  lessonId: string;
  hrefBase: '/lesson/' | '/my-lesson/';
}) {
  const { t } = useTranslation();
  const previous = usePreviousLessonId(lessonId);
  const id = previous.data;

  if (previous.isPending) return null;
  if (!id) {
    return (
      <Card title={t('previous.title')}>
        <AppText tone="muted">{t('previous.none')}</AppText>
      </Card>
    );
  }
  return <PreviousLessonContent id={id} hrefBase={hrefBase} />;
}

function PreviousLessonContent({ id, hrefBase }: { id: string; hrefBase: '/lesson/' | '/my-lesson/' }) {
  const { t } = useTranslation();
  const zone = useViewerZone();
  const locale = useLocale();
  const lesson = useLesson(id);
  const notes = useNotes({ lessonId: id });
  const homework = useLessonHomework(id);

  if (!lesson.data) return null;
  const items = notes.data ?? [];
  const tasks = homework.data ?? [];

  return (
    <Card title={`${t('previous.title')} · ${formatDayLong(localDate(lesson.data.start_at, zone), locale)}`}>
      {items.length === 0 && tasks.length === 0 ? (
        <AppText tone="muted">{t('previous.nothing')}</AppText>
      ) : null}
      {items.slice(0, 3).map((n) => (
        <View key={n.id} style={styles.item}>
          <MarkdownText text={n.body} numberOfLines={4} />
        </View>
      ))}
      {tasks.length > 0 ? (
        <View style={styles.item}>
          <AppText variant="label" tone="muted">
            {t('homework.title')}
          </AppText>
          {tasks.map((h) => (
            <AppText key={h.id}>
              {h.status === 'done' ? '✓ ' : '○ '}
              {h.student ? `${h.student.first_name}: ` : ''}
              {h.title}
            </AppText>
          ))}
        </View>
      ) : null}
      <Button title={t('previous.open')} variant="ghost" onPress={() => router.push(`${hrefBase}${id}`)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  item: { gap: 2 },
});
