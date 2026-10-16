import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import {
  addMinutesIso,
  durationMinutes,
  formatDayLong,
  formatTime,
  formatTimeRange,
  localDate,
} from '@/lib/time';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { useLocale, useViewerZone } from '../../lessons/hooks';
import type { LessonRequest, RequestStatus } from '../api';

const STATUS_TONE: Record<RequestStatus, 'primary' | 'success' | 'danger' | 'muted'> = {
  pending: 'primary',
  accepted: 'success',
  declined: 'danger',
  withdrawn: 'muted',
};

/** „Mo., 3. Nov., 18:00–19:00“ in der Zone des Betrachters. */
export function useSlotFormatter() {
  const zone = useViewerZone();
  const locale = useLocale();
  return (start: string, minutes: number) =>
    `${formatDayLong(localDate(start, zone), locale)}, ${formatTimeRange(start, addMinutesIso(start, minutes), zone, locale)}`;
}

export function formatStamp(iso: string, zone: string, locale: string) {
  return `${formatDayLong(localDate(iso, zone), locale)}, ${formatTime(iso, zone, locale)}`;
}

type Props = {
  request: LessonRequest;
  showStudent?: boolean;
  /** Vorschläge ausblenden, z. B. wenn der Lehrer sie als Auswahl daneben sieht */
  hideSlots?: boolean;
};

export function RequestSummary({ request, showStudent, hideSlots }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const zone = useViewerZone();
  const locale = useLocale();
  const formatSlot = useSlotFormatter();
  const minutes = request.lesson ? durationMinutes(request.lesson.start_at, request.lesson.end_at) : 60;
  const studentName = [request.student?.first_name, request.student?.last_name].filter(Boolean).join(' ');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="bodyStrong">{t(`requests.kind.${request.kind}`)}</AppText>
        <AppText variant="label" tone={STATUS_TONE[request.status]}>
          {t(`requests.status.${request.status}`)}
        </AppText>
        {request.is_late ? (
          <View style={[styles.badge, { borderColor: colors.danger }]}>
            <AppText variant="caption" tone="danger">
              {t('requests.late')}
            </AppText>
          </View>
        ) : null}
      </View>

      {showStudent && studentName ? (
        <AppText tone="muted">
          {t('requests.from')}: {studentName}
        </AppText>
      ) : null}

      {request.kind === 'reschedule' && request.status === 'accepted' && request.chosen_start ? (
        <AppText>
          {t('requests.chosen')}:{' '}
          <AppText variant="bodyStrong">{formatSlot(request.chosen_start, minutes)}</AppText>
        </AppText>
      ) : request.kind === 'reschedule' && !hideSlots ? (
        <View style={styles.slots}>
          <AppText variant="label" tone="muted">
            {t('requests.proposed')}
          </AppText>
          {request.proposed_starts.map((s) => (
            <AppText key={s}>• {formatSlot(s, minutes)}</AppText>
          ))}
        </View>
      ) : null}

      {request.message ? (
        <View style={[styles.quote, { borderColor: colors.border }]}>
          <AppText>{request.message}</AppText>
        </View>
      ) : null}

      {request.response ? (
        <AppText>
          <AppText variant="bodyStrong">{t('requests.response')}: </AppText>
          {request.response}
        </AppText>
      ) : null}

      <AppText variant="caption" tone="muted">
        {t('requests.requestedAt', { when: formatStamp(request.created_at, zone, locale) })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  badge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm },
  slots: { gap: 2 },
  quote: { borderLeftWidth: 3, paddingLeft: spacing.sm, paddingVertical: 2 },
});
