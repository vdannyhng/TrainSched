import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { addMonths, formatDayLong, formatMonth, type LocalDate } from '@/lib/time';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { MonthGrid } from './MonthGrid';

type Props = {
  label: string;
  value: LocalDate | '';
  today: LocalDate;
  onChange: (date: LocalDate) => void;
  error?: string;
  placeholder?: string;
  onClear?: () => void;
};

/** Datumsfeld mit eigenem Monatskalender (funktioniert identisch auf iOS, Android und Web). */
export function DateField({ label, value, today, onChange, error, placeholder, onClear }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<LocalDate>(value || today);

  return (
    <View style={styles.container}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? formatDayLong(value, i18n.language) : (placeholder ?? '')}`}
          onPress={() => {
            setMonth(value || today);
            setOpen(true);
          }}
          style={[
            styles.field,
            { borderColor: error ? colors.danger : colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <AppText tone={value ? 'default' : 'muted'}>
            {value ? formatDayLong(value, i18n.language) : placeholder}
          </AppText>
        </Pressable>
        {value && onClear ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
            onPress={onClear}
            style={styles.clear}
          >
            <Ionicons name="close-circle-outline" size={24} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          {/* Hintergrund als Geschwister des Inhalts – verschachtelte Buttons erzeugen Fehler (child/parent) */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityLabel={t('common.cancel')}
          />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('calendar.previous')}
                onPress={() => setMonth((m) => addMonths(m, -1))}
                style={styles.nav}
              >
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </Pressable>
              <AppText variant="heading" style={styles.title}>
                {formatMonth(month, i18n.language)}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('calendar.next')}
                onPress={() => setMonth((m) => addMonths(m, 1))}
                style={styles.nav}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </Pressable>
            </View>
            <MonthGrid
              month={month}
              selected={value || null}
              today={today}
              locale={i18n.language}
              onSelect={(date) => {
                onChange(date);
                setOpen(false);
              }}
            />
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  clear: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing.md },
  sheet: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center' },
  nav: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
