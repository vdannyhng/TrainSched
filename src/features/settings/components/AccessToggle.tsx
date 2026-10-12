import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, FormMessage } from '@/components/ui';
import { confirmAsync } from '@/lib/confirm';
import { errorKey } from '@/lib/errors';
import { spacing } from '@/theme/tokens';

import { useAccessStatus, useSetAccessPaused } from '../api';

/** Status + Schalter „Zugang pausieren / wieder aktivieren“ für ein Konto. */
export function AccessToggle({
  profileId,
  pausedAt: knownPausedAt,
}: {
  profileId: string;
  pausedAt?: string | null;
}) {
  const { t, i18n } = useTranslation();
  const status = useAccessStatus(knownPausedAt === undefined ? profileId : null);
  const setPaused = useSetAccessPaused();
  const pausedAt = knownPausedAt !== undefined ? knownPausedAt : status.data;
  const paused = !!pausedAt;

  return (
    <View style={styles.container}>
      <AppText tone={paused ? 'danger' : 'success'}>
        {paused
          ? t('access.paused', {
              date: DateTime.fromISO(pausedAt!).setLocale(i18n.language).toLocaleString(DateTime.DATE_MED),
            })
          : t('access.active')}
      </AppText>
      <FormMessage message={setPaused.error ? t(errorKey(setPaused.error)) : undefined} />
      <Button
        title={paused ? t('access.resume') : t('access.pause')}
        variant="secondary"
        loading={setPaused.isPending}
        onPress={async () => {
          if (!paused) {
            const ok = await confirmAsync({
              title: t('access.pauseTitle'),
              message: t('access.pauseMessage'),
              confirmLabel: t('access.pause'),
              cancelLabel: t('common.cancel'),
            });
            if (!ok) return;
          }
          setPaused.mutate({ profileId, paused: !paused });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
});
