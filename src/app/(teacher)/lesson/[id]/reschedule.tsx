import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  ChipRow,
  ErrorState,
  FormMessage,
  LoadingState,
  Screen,
  TextField,
} from '@/components/ui';
import {
  checkConflicts,
  lessonLabel,
  useLesson,
  useRescheduleLesson,
  type Conflict,
} from '@/features/lessons/api';
import { ConflictNotice } from '@/features/lessons/components/ConflictNotice';
import { DateField } from '@/features/lessons/components/DateField';
import { useLocale, useViewerZone } from '@/features/lessons/hooks';
import { useTeacherSettings } from '@/features/settings/api';
import { errorKey } from '@/lib/errors';
import {
  addDays,
  addMinutesIso,
  durationMinutes,
  formatDayLong,
  formatTimeRange,
  isValidLocalTime,
  localDate,
  localTime,
  todayIn,
  toUtcIso,
} from '@/lib/time';
import { spacing } from '@/theme/tokens';

/** Verschieben in ≤ 3 Taps: „Verschieben“ → Schnellauswahl (z. B. +1 Woche) → „Verschieben“. */
export default function RescheduleScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useViewerZone();
  const locale = useLocale();
  const lesson = useLesson(id);
  const settings = useTeacherSettings(lesson.data?.teacher_id);
  const reschedule = useRescheduleLesson(id);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<unknown>(null);

  if (lesson.isPending) return <LoadingState />;
  if (lesson.isError)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void lesson.refetch()} />;

  const l = lesson.data;
  const origDate = localDate(l.start_at, zone);
  const origTime = localTime(l.start_at, zone);
  const newDate = date ?? addDays(origDate, 7);
  const newTime = time ?? origTime;
  const timeValid = isValidLocalTime(newTime);
  const start = timeValid ? toUtcIso(newDate, newTime, zone) : null;
  const end = start ? addMinutesIso(start, durationMinutes(l.start_at, l.end_at)) : null;

  const shiftTime = (hours: number) => {
    if (!timeValid) return;
    const [h, m] = newTime.split(':').map(Number) as [number, number];
    const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + hours * 60));
    setTime(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
  };

  const save = () => reschedule.mutate({ start: start!, end: end! }, { onSuccess: () => router.back() });

  const submit = async () => {
    if (!start || !end) return;
    setCheckError(null);
    setChecking(true);
    try {
      const found = await checkConflicts(l.teacher_id, [{ start, end }], [l.id]);
      if (found.length) setConflicts(found);
      else save();
    } catch (e) {
      setCheckError(e);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <AppText variant="heading">{lessonLabel(l)}</AppText>
      <AppText tone="muted">
        {formatDayLong(origDate, locale)}, {formatTimeRange(l.start_at, l.end_at, zone, locale)}
      </AppText>

      <Card title={t('lessons.reschedule.quick')}>
        <ChipRow>
          <Chip
            label={t('lessons.reschedule.plusDay')}
            selected={newDate === addDays(origDate, 1)}
            onPress={() => setDate(addDays(origDate, 1))}
          />
          <Chip
            label={t('lessons.reschedule.plusWeek')}
            selected={newDate === addDays(origDate, 7)}
            onPress={() => setDate(addDays(origDate, 7))}
          />
          <Chip label={t('lessons.reschedule.minusHour')} selected={false} onPress={() => shiftTime(-1)} />
          <Chip label={t('lessons.reschedule.plusHour')} selected={false} onPress={() => shiftTime(1)} />
        </ChipRow>
        <DateField
          label={t('lessons.reschedule.newDate')}
          value={newDate}
          today={todayIn(zone)}
          onChange={setDate}
        />
        <TextField
          label={t('lessons.reschedule.newTime')}
          value={newTime}
          onChangeText={setTime}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          error={timeValid ? undefined : t('validation.invalid_time')}
        />
        {start && end ? (
          <AppText variant="bodyStrong">
            → {formatDayLong(newDate, locale)}, {formatTimeRange(start, end, zone, locale)}
          </AppText>
        ) : null}
      </Card>

      {conflicts ? (
        <ConflictNotice
          conflicts={conflicts}
          bufferMinutes={settings.data?.buffer_minutes ?? 15}
          isSeries={false}
          confirming={reschedule.isPending}
          onConfirm={save}
          onCancel={() => setConflicts(null)}
        />
      ) : null}
      <FormMessage
        message={checkError || reschedule.error ? t(errorKey(checkError ?? reschedule.error)) : undefined}
      />

      <View style={styles.actions}>
        <Button
          title={t('lessons.reschedule.save')}
          disabled={!start || !!conflicts}
          loading={checking || (reschedule.isPending && !conflicts)}
          onPress={() => void submit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
});
