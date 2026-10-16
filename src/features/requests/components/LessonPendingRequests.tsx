import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { spacing } from '@/theme/tokens';

import { useLessonRequests } from '../api';
import { RequestSummary } from './RequestSummary';

/** Lehrer: offene Anfragen direkt auf der Terminseite, mit Sprung zur Entscheidung. */
export function LessonPendingRequests({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const requests = useLessonRequests(lessonId);
  const pending = (requests.data ?? []).filter((r) => r.status === 'pending');
  if (pending.length === 0) return null;
  return (
    <Card title={t('requests.open')}>
      {pending.map((r) => (
        <View key={r.id} style={styles.item}>
          <RequestSummary request={r} showStudent />
          <Button title={t('common.open')} onPress={() => router.push(`/request/${r.id}`)} />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  item: { gap: spacing.sm },
});
