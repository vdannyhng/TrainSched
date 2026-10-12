import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chip, ChipRow, FormTextField, Segmented, TextField } from '@/components/ui';
import type { Tag } from '@/features/tags/api';
import { LEVEL_COLORS, LEVELS, type Level } from '@/lib/colors';
import type { LocalDate } from '@/lib/time';
import { validationMessage } from '@/lib/validation';
import { spacing } from '@/theme/tokens';

import { DURATION_PRESETS, lessonFormSchema, type LessonFormOutput, type LessonFormValues } from '../schemas';
import { DateField } from './DateField';
import { StudentPicker } from './StudentPicker';

export type LessonFormMode = 'create' | 'this' | 'following';

type Props = {
  mode: LessonFormMode;
  defaultValues: LessonFormValues;
  tags: Tag[];
  today: LocalDate;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: LessonFormOutput) => void;
};

export function LessonForm({ mode, defaultValues, tags, today, submitLabel, submitting, onSubmit }: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit, setValue } = useForm<LessonFormValues, unknown, LessonFormOutput>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues,
  });
  const [repeat, format, durationMin] = useWatch({ control, name: ['repeat', 'format', 'durationMin'] });
  const isPreset = (DURATION_PRESETS as readonly number[]).includes(durationMin);

  const repeatOptions = (
    mode === 'following' ? (['weekly', 'biweekly'] as const) : (['none', 'weekly', 'biweekly'] as const)
  ).map((r) => ({ value: r, label: t(`lessons.repeat.${r}`) }));

  return (
    <View style={styles.form}>
      <Card>
        <Controller
          control={control}
          name="studentIds"
          render={({ field, fieldState }) => (
            <StudentPicker
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error ? t(validationMessage(fieldState.error.message)) : undefined}
            />
          )}
        />
      </Card>

      <Card>
        <Controller
          control={control}
          name="date"
          render={({ field, fieldState }) => (
            <DateField
              label={t('lessons.fields.date')}
              value={field.value}
              today={today}
              onChange={field.onChange}
              error={fieldState.error ? t(validationMessage(fieldState.error.message)) : undefined}
            />
          )}
        />
        <FormTextField
          control={control}
          name="time"
          label={t('lessons.fields.time')}
          hint={t('lessons.fields.timeHint')}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          autoCorrect={false}
        />
        <Segmented
          label={t('lessons.fields.duration')}
          value={isPreset ? String(durationMin) : 'custom'}
          onChange={(v) => {
            if (v !== 'custom') setValue('durationMin', Number(v), { shouldValidate: true });
          }}
          options={[
            ...DURATION_PRESETS.map((d) => ({ value: String(d), label: t('common.minutes', { count: d }) })),
            { value: 'custom', label: '…' },
          ]}
        />
        {!isPreset ? (
          <Controller
            control={control}
            name="durationMin"
            render={({ field, fieldState }) => (
              <TextField
                label={t('lessons.fields.duration')}
                keyboardType="number-pad"
                value={String(field.value || '')}
                onChangeText={(text) => field.onChange(Number(text.replace(/\D/g, '')) || 0)}
                error={fieldState.error ? t(validationMessage(fieldState.error.message)) : undefined}
              />
            )}
          />
        ) : null}
        {mode !== 'this' ? (
          <Controller
            control={control}
            name="repeat"
            render={({ field }) => (
              <Segmented
                label={t('lessons.fields.repeat')}
                value={field.value}
                onChange={field.onChange}
                options={repeatOptions}
              />
            )}
          />
        ) : null}
        {mode === 'create' && repeat !== 'none' ? (
          <Controller
            control={control}
            name="endDate"
            render={({ field, fieldState }) => (
              <View style={styles.group}>
                <DateField
                  label={t('lessons.fields.endDate')}
                  value={field.value}
                  today={today}
                  onChange={field.onChange}
                  onClear={() => field.onChange('')}
                  placeholder="–"
                  error={fieldState.error ? t(validationMessage(fieldState.error.message)) : undefined}
                />
                <AppText variant="caption" tone="muted">
                  {t('lessons.fields.endDateHint')}
                </AppText>
              </View>
            )}
          />
        ) : null}
      </Card>

      <Card>
        <Controller
          control={control}
          name="format"
          render={({ field }) => (
            <Segmented
              label={t('lessons.fields.format')}
              value={field.value}
              onChange={field.onChange}
              options={(['in_person', 'online'] as const).map((f) => ({
                value: f,
                label: t(`lessons.format.${f}`),
              }))}
            />
          )}
        />
        {format === 'online' ? (
          <FormTextField
            control={control}
            name="meetingUrl"
            label={t('lessons.fields.meetingUrl')}
            placeholder="https://"
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
          />
        ) : (
          <FormTextField control={control} name="location" label={t('lessons.fields.location')} />
        )}
        <FormTextField
          control={control}
          name="title"
          label={t('lessons.fields.title')}
          hint={t('lessons.fields.titleHint')}
        />
      </Card>

      <Card>
        <Controller
          control={control}
          name="level"
          render={({ field }) => (
            <Segmented
              label={t('lessons.fields.level')}
              value={field.value ?? 'none'}
              onChange={(v) => field.onChange(v === 'none' ? null : (v as Level))}
              options={[{ value: 'none', label: '–' }, ...LEVELS.map((l) => ({ value: l, label: l }))]}
            />
          )}
        />
        <Controller
          control={control}
          name="tagIds"
          render={({ field }) => (
            <View style={styles.group}>
              <AppText variant="label">{t('lessons.fields.topics')}</AppText>
              <ChipRow>
                {tags.map((tag) => {
                  const selected = field.value.includes(tag.id);
                  return (
                    <Chip
                      key={tag.id}
                      label={tag.label}
                      color={tag.color}
                      selected={selected}
                      onPress={() =>
                        field.onChange(
                          selected ? field.value.filter((id) => id !== tag.id) : [...field.value, tag.id],
                        )
                      }
                    />
                  );
                })}
              </ChipRow>
            </View>
          )}
        />
      </Card>

      <Button title={submitLabel} loading={submitting} onPress={handleSubmit(onSubmit)} />
    </View>
  );
}

export function levelColor(level: Level | null | undefined): string | undefined {
  return level ? LEVEL_COLORS[level] : undefined;
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  group: { gap: spacing.xs },
});
