import { StyleSheet, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { formatDayLong, monthGrid, weekdayShortNames, type LocalDate } from '@/lib/time';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Props = {
  month: LocalDate; // ein beliebiger Tag im Monat
  selected?: LocalDate | null;
  today: LocalDate;
  locale: string;
  /** Anzahl Termine pro Tag → Punkte unter der Zahl */
  counts?: Record<LocalDate, number>;
  onSelect: (date: LocalDate) => void;
};

/** Monatsraster (Montag zuerst). Dient als Monatsansicht und als Datumsauswahl. */
export function MonthGrid({ month, selected, today, locale, counts, onSelect }: Props) {
  const { colors } = useTheme();
  const weeks = monthGrid(month);

  return (
    <View style={styles.grid}>
      <View style={styles.week}>
        {weekdayShortNames(locale).map((name) => (
          <AppText key={name} variant="caption" tone="muted" style={styles.weekday}>
            {name}
          </AppText>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]!.date} style={styles.week}>
          {week.map(({ date, inMonth }) => {
            const isSelected = date === selected;
            const isToday = date === today;
            const count = counts?.[date] ?? 0;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${formatDayLong(date, locale)}${count ? `, ${count}` : ''}`}
                onPress={() => onSelect(date)}
                style={[
                  styles.day,
                  isSelected && { backgroundColor: colors.primary },
                  !isSelected && isToday && { borderColor: colors.primary, borderWidth: 1.5 },
                ]}
              >
                <AppText
                  variant={isToday ? 'bodyStrong' : 'body'}
                  tone={isSelected ? 'onPrimary' : inMonth ? 'default' : 'muted'}
                >
                  {Number(date.slice(8))}
                </AppText>
                <View style={styles.dots}>
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        { backgroundColor: isSelected ? colors.onPrimary : colors.primary },
                      ]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 2 },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: spacing.xs },
  day: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 56,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
