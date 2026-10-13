import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { formatDayLong, type LocalDate } from '@/lib/time';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Props = {
  slot: { date: LocalDate; time: string; durationMin?: number } | null;
  locale: string;
  onLesson: () => void;
  onBlocker: () => void;
  onClose: () => void;
};

function endOf(time: string, durationMin = 60): string {
  const [h, m] = time.split(':').map(Number) as [number, number];
  const end = Math.min(24 * 60, h * 60 + m + durationMin);
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}

/** Auswahl nach langem Drücken im Kalender: Termin oder Blocker an dieser Stelle anlegen. */
export function SlotActionSheet({ slot, locale, onLesson, onBlocker, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Modal visible={!!slot} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Hintergrund als Geschwister des Inhalts → keine verschachtelten Buttons */}
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityLabel={t('common.cancel')}
        />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {slot ? (
            <AppText variant="heading" style={styles.center}>
              {`${formatDayLong(slot.date, locale)}\n${slot.time}–${endOf(slot.time, slot.durationMin)}`}
            </AppText>
          ) : null}
          <Button title={t('lessons.new')} onPress={onLesson} />
          <Button title={t('blockers.new')} variant="secondary" onPress={onBlocker} />
          <Button title={t('common.cancel')} variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', padding: spacing.md },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  center: { textAlign: 'center' },
});
