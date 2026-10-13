import { zodResolver } from '@hookform/resolvers/zod';
import { DateTime } from 'luxon';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chip, ChipRow, FormTextField, Segmented } from '@/components/ui';
import { DateField } from '@/features/lessons/components/DateField';
import type { LocalDate } from '@/lib/time';
import { validationMessage } from '@/lib/validation';
import { spacing } from '@/theme/tokens';

import { blockerFormSchema, type BlockerFormOutput, type BlockerFormValues } from '../api';

type Props = {
  defaultValues: BlockerFormValues;
  today: LocalDate;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: BlockerFormOutput) => void;
};

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function BlockerForm({ defaultValues, today, submitLabel, submitting, onSubmit }: Props) {
  const { t, i18n } = useTranslation();
  const { control, handleSubmit } = useForm<BlockerFormValues, unknown, BlockerFormOutput>({
    resolver: zodResolver(blockerFormSchema),
    defaultValues,
  });
  const repeat = useWatch({ control, name: 'repeat' });
  // Kurznamen über Intl.format (nicht formatToParts → iOS-sicher)
  const dayName = (d: number) =>
    DateTime.fromISO('2026-01-04')
      .plus({ days: d })
      .setLocale(i18n.language)
      .toLocaleString({ weekday: 'short' });

  return (
    <View style={styles.form}>
      <Card>
        <AppText tone="muted">{t('blockers.hint')}</AppText>
        <FormTextField
          control={control}
          name="title"
          label={t('blockers.fields.title')}
          placeholder={t('blockers.fields.titlePlaceholder')}
          maxLength={80}
        />
        <Controller
          control={control}
          name="date"
          render={({ field, fieldState }) => (
            <DateField
              label={repeat === 'weekly' ? t('blockers.fields.from') : t('lessons.fields.date')}
              value={field.value}
              today={today}
              onChange={field.onChange}
              error={fieldState.error ? t(validationMessage(fieldState.error.message)) : undefined}
            />
          )}
        />
        <View style={styles.times}>
          <View style={styles.flex}>
            <FormTextField
              control={control}
              name="startTime"
              label={t('blockers.fields.start')}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <View style={styles.flex}>
            <FormTextField
              control={control}
              name="endTime"
              label={t('blockers.fields.end')}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        </View>
      </Card>

      <Card>
        <Controller
          control={control}
          name="repeat"
          render={({ field }) => (
            <Segmented
              label={t('lessons.fields.repeat')}
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'none', label: t('lessons.repeat.none') },
                { value: 'weekly', label: t('lessons.repeat.weekly') },
              ]}
            />
          )}
        />
        {repeat === 'weekly' ? (
          <>
            <Controller
              control={control}
              name="weekdays"
              render={({ field, fieldState }) => (
                <View style={styles.group}>
                  <AppText variant="label">{t('blockers.fields.weekdays')}</AppText>
                  <ChipRow>
                    {WEEKDAYS.map((d) => {
                      const selected = field.value.includes(d);
                      return (
                        <Chip
                          key={d}
                          label={dayName(d)}
                          selected={selected}
                          onPress={() =>
                            field.onChange(
                              selected ? field.value.filter((v) => v !== d) : [...field.value, d],
                            )
                          }
                        />
                      );
                    })}
                  </ChipRow>
                  <ChipRow>
                    <Chip
                      label={t('blockers.fields.workdays')}
                      selected={false}
                      onPress={() => field.onChange([1, 2, 3, 4, 5])}
                    />
                  </ChipRow>
                  {fieldState.error ? (
                    <AppText variant="caption" tone="danger">
                      {t(validationMessage(fieldState.error.message))}
                    </AppText>
                  ) : null}
                </View>
              )}
            />
            <Controller
              control={control}
              name="endDate"
              render={({ field, fieldState }) => (
                <DateField
                  label={t('blockers.fields.until')}
                  value={field.value}
                  today={today}
                  onChange={field.onChange}
                  onClear={() => field.onChange('')}
                  placeholder={t('blockers.fields.noEnd')}
                  error={fieldState.error ? t(validationMessage(fieldState.error.message)) : undefined}
                />
              )}
            />
          </>
        ) : null}
      </Card>

      <Button title={submitLabel} loading={submitting} onPress={handleSubmit(onSubmit)} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  group: { gap: spacing.sm },
  times: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
