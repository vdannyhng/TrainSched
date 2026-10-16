import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, ChipRow, FormMessage, InfoRow } from '@/components/ui';
import { errorKey } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import { profileQueryKey } from '../auth/AuthProvider';
import type { Profile } from '../auth/api';
import { useEnablePush, usePushStatus } from './usePushStatus';

export const REMINDER_OPTIONS = [15, 60, 180, 1440, 2880] as const;

/** Konto: Push auf diesem Gerät + Vorlaufzeiten der Erinnerungen (gelten für alle Geräte). */
export function NotificationsCard({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const status = usePushStatus();
  const enable = useEnablePush();
  const offsets = profile.reminder_offsets_min;

  const update = useMutation({
    mutationFn: async (next: number[]) => {
      const { error } = await supabase
        .from('profiles')
        .update({ reminder_offsets_min: next })
        .eq('id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileQueryKey(profile.id) }),
  });

  const toggle = (minutes: number) => {
    if (update.isPending) return;
    const next = offsets.includes(minutes) ? offsets.filter((m) => m !== minutes) : [...offsets, minutes];
    update.mutate(next.sort((a, b) => b - a));
  };

  const s = status.data;
  const canEnable = s === 'undetermined' || s === 'denied';

  return (
    <Card title={t('push.title')}>
      <InfoRow label={t('push.device')} value={s ? t(`push.status.${s}`) : t('common.loading')} />
      {canEnable ? (
        <Button
          title={s === 'denied' ? t('push.openSettings') : t('push.enable')}
          variant="secondary"
          loading={enable.isPending}
          onPress={() => enable.mutate()}
        />
      ) : null}

      <AppText variant="label">{t('push.reminders')}</AppText>
      <ChipRow>
        {REMINDER_OPTIONS.map((m) => (
          <Chip
            key={m}
            label={t(`push.offsets.${m}`)}
            selected={offsets.includes(m)}
            onPress={() => toggle(m)}
          />
        ))}
      </ChipRow>
      <AppText variant="caption" tone="muted">
        {t('push.remindersHint')}
      </AppText>
      <FormMessage message={update.error ? t(errorKey(update.error)) : undefined} />
    </Card>
  );
}
