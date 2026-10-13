import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { formatDayShort, formatTimeRange, localDate } from '@/lib/time';
import { spacing } from '@/theme/tokens';

import type { Conflict } from '../api';
import { useLocale, useViewerZone } from '../hooks';

type Props = {
  conflicts: Conflict[];
  bufferMinutes: number;
  isSeries: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
};

/**
 * Zeigt Überschneidungen und Puffer-Warnungen vor dem Speichern.
 * Einzeltermin mit Überschneidung → nicht speicherbar. Serie → überschneidende Vorkommen werden übersprungen.
 */
export function ConflictNotice({
  conflicts,
  bufferMinutes,
  isSeries,
  onConfirm,
  onCancel,
  confirming,
}: Props) {
  const { t } = useTranslation();
  const zone = useViewerZone();
  const locale = useLocale();
  const hasOverlap = conflicts.some((c) => c.kind === 'overlap');
  const blocked = hasOverlap && !isSeries;

  return (
    <Card title={t('lessons.conflicts.title')}>
      <View style={styles.list} accessibilityRole="alert">
        {conflicts.slice(0, 8).map((c) => {
          const time = `${formatDayShort(localDate(c.start_at, zone), locale)} ${formatTimeRange(c.start_at, c.end_at, zone, locale)}`;
          return (
            <AppText
              key={`${c.range_index}-${c.lesson_id ?? c.start_at}`}
              tone={c.kind === 'overlap' ? 'danger' : 'default'}
            >
              •{' '}
              {c.kind === 'overlap'
                ? t('lessons.conflicts.overlap', { label: c.label ?? '–', time })
                : c.kind === 'blocker'
                  ? t('lessons.conflicts.blocker', { label: c.label ?? '–', time })
                  : t('lessons.conflicts.buffer', { label: c.label ?? '–', time, minutes: bufferMinutes })}
            </AppText>
          );
        })}
        {conflicts.length > 8 ? <AppText tone="muted">+{conflicts.length - 8}</AppText> : null}
      </View>
      {hasOverlap ? (
        <AppText tone="muted">
          {isSeries ? t('lessons.conflicts.seriesOverlapHint') : t('lessons.conflicts.singleOverlapHint')}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button title={t('lessons.conflicts.change')} variant="secondary" onPress={onCancel} />
        </View>
        {!blocked ? (
          <View style={styles.flex}>
            <Button title={t('lessons.conflicts.saveAnyway')} loading={confirming} onPress={onConfirm} />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
