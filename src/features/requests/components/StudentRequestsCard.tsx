import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, FormMessage } from '@/components/ui';
import { confirmAsync } from '@/lib/confirm';
import { errorKey } from '@/lib/errors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import type { Lesson } from '../../lessons/api';
import { useLessonRequests, useWithdrawRequest } from '../api';
import { RequestSummary } from './RequestSummary';

/** Schüler: eigene Anfragen zu diesem Termin + Einstieg „Verschieben oder absagen“. */
export function StudentRequestsCard({ lesson }: { lesson: Lesson }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const requests = useLessonRequests(lesson.id);
  const withdraw = useWithdrawRequest();
  const list = requests.data ?? [];
  const hasPending = list.some((r) => r.status === 'pending');
  const canAsk = lesson.status === 'scheduled' && new Date(lesson.start_at) > new Date() && !hasPending;

  if (!canAsk && list.length === 0) return null;

  return (
    <Card title={list.length ? t('requests.yourRequests') : t('requests.formTitle')}>
      {list.map((r) => (
        <View key={r.id} style={[styles.item, { borderColor: colors.border }]}>
          <RequestSummary request={r} />
          {r.status === 'pending' ? (
            <Button
              title={t('requests.withdraw')}
              variant="ghost"
              loading={withdraw.isPending && withdraw.variables === r.id}
              onPress={() =>
                void confirmAsync({
                  title: t('requests.withdraw'),
                  confirmLabel: t('requests.withdraw'),
                  cancelLabel: t('common.cancel'),
                  destructive: true,
                }).then((ok) => ok && withdraw.mutate(r.id))
              }
            />
          ) : null}
        </View>
      ))}
      <FormMessage message={withdraw.error ? t(errorKey(withdraw.error)) : undefined} />
      {canAsk ? (
        <>
          {list.length === 0 ? <AppText tone="muted">{t('requests.askHint')}</AppText> : null}
          <Button
            title={t('requests.ask')}
            variant="secondary"
            onPress={() => router.push(`/my-lesson/${lesson.id}/request`)}
          />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  item: { gap: spacing.xs, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
