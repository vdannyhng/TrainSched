import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chip, ChipRow, FormTextField, Segmented, SwitchRow } from '@/components/ui';
import type { Tag } from '@/features/tags/api';
import { LEVELS, type Level } from '@/lib/colors';
import { COMMON_TIMEZONES, timezoneCity } from '@/lib/timezones';
import { spacing } from '@/theme/tokens';

import {
  STUDENT_STATUSES,
  studentFormSchema,
  type StudentFormOutput,
  type StudentFormValues,
} from '../schemas';

type Props = {
  defaultValues: StudentFormValues;
  tags: Tag[];
  onSubmit: (values: StudentFormOutput) => void;
  submitting: boolean;
  submitLabel: string;
};

export function StudentForm({ defaultValues, tags, onSubmit, submitting, submitLabel }: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit, setValue } = useForm<StudentFormValues, unknown, StudentFormOutput>({
    resolver: zodResolver(studentFormSchema),
    defaultValues,
  });
  const isMinor = useWatch({ control, name: 'isMinor' });
  const timezone = useWatch({ control, name: 'timezone' });

  const levelOptions = (allowNone: boolean) => [
    ...(allowNone ? [{ value: 'none' as const, label: '–' }] : []),
    ...LEVELS.map((l) => ({ value: l, label: l })),
  ];

  return (
    <View style={styles.form}>
      <Card title={t('students.sections.contact')}>
        <FormTextField
          control={control}
          name="firstName"
          label={t('students.fields.firstName')}
          autoComplete="given-name"
        />
        <FormTextField
          control={control}
          name="lastName"
          label={t('students.fields.lastName')}
          autoComplete="family-name"
        />
        <FormTextField
          control={control}
          name="email"
          label={`${t('students.fields.email')} (${t('common.optional')})`}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <FormTextField
          control={control}
          name="phone"
          label={`${t('students.fields.phone')} (${t('common.optional')})`}
          keyboardType="phone-pad"
        />
        <FormTextField
          control={control}
          name="timezone"
          label={t('students.fields.timezone')}
          hint={t('students.fields.timezoneHint')}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ChipRow>
          {COMMON_TIMEZONES.map((zone) => (
            <Chip
              key={zone}
              label={timezoneCity(zone)}
              selected={timezone === zone}
              onPress={() => setValue('timezone', zone, { shouldValidate: true, shouldDirty: true })}
              accessibilityLabel={zone}
            />
          ))}
        </ChipRow>
        <Controller
          control={control}
          name="locale"
          render={({ field }) => (
            <Segmented
              label={t('students.fields.locale')}
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'de', label: t('account.languages.de') },
                { value: 'vi', label: t('account.languages.vi') },
              ]}
            />
          )}
        />
      </Card>

      <Card title={t('students.sections.learning')}>
        <Controller
          control={control}
          name="currentLevel"
          render={({ field }) => (
            <Segmented
              label={t('levels.current')}
              value={field.value ?? 'none'}
              onChange={(v) => field.onChange(v === 'none' ? null : (v as Level))}
              options={levelOptions(true)}
            />
          )}
        />
        <Controller
          control={control}
          name="startLevel"
          render={({ field }) => (
            <Segmented
              label={t('levels.start')}
              value={field.value ?? 'none'}
              onChange={(v) => field.onChange(v === 'none' ? null : (v as Level))}
              options={levelOptions(true)}
            />
          )}
        />
        <FormTextField
          control={control}
          name="goal"
          label={`${t('students.fields.goal')} (${t('common.optional')})`}
          multiline
          style={styles.multiline}
        />
        <Controller
          control={control}
          name="tagIds"
          render={({ field }) => (
            <View style={styles.group}>
              <AppText variant="label">{t('students.fields.topics')}</AppText>
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
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Segmented
              label={t('status.label')}
              value={field.value}
              onChange={field.onChange}
              options={STUDENT_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
            />
          )}
        />
      </Card>

      <Card title={t('students.sections.guardian')}>
        <Controller
          control={control}
          name="isMinor"
          render={({ field }) => (
            <SwitchRow
              label={t('students.minor')}
              hint={t('students.minorHint')}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
        {isMinor ? (
          <>
            <FormTextField control={control} name="guardianName" label={t('students.guardianName')} />
            <FormTextField
              control={control}
              name="guardianEmail"
              label={t('students.guardianEmail')}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <FormTextField
              control={control}
              name="guardianPhone"
              label={t('students.guardianPhone')}
              keyboardType="phone-pad"
            />
            <Controller
              control={control}
              name="guardianConsent"
              render={({ field }) => (
                <SwitchRow
                  label={t('students.guardianConsent')}
                  hint={t('students.guardianConsentHint')}
                  value={field.value}
                  onValueChange={field.onChange}
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
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
