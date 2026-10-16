import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ErrorState,
  FormMessage,
  LoadingState,
  Screen,
  Segmented,
  TextField,
} from '@/components/ui';
import { useLesson } from '@/features/lessons/api';
import { DateField } from '@/features/lessons/components/DateField';
import { useLocale, useViewerZone } from '@/features/lessons/hooks';
import { useCancelDeadline, useCreateRequest, type RequestKind } from '@/features/requests/api';
import { formatStamp } from '@/features/requests/components/RequestSummary';
import { buildSlotStarts, MAX_SLOTS, type SlotInput } from '@/features/requests/slots';
import { errorKey } from '@/lib/errors';
import {
  addDays,
  formatDayLong,
  formatTimeRange,
  isValidLocalTime,
  localDate,
  localTime,
  todayIn,
  zoneCity,
} from '@/lib/time';
import { spacing } from '@/theme/tokens';

/** Schüler: Verschieben (mit bis zu 3 Ersatzterminen) oder Absage anfragen. */
export default function LessonRequestScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useViewerZone();
  const locale = useLocale();
  const lesson = useLesson(id);
  const deadline = useCancelDeadline(id);
  const create = useCreateRequest(id);
  const [kind, setKind] = useState<RequestKind>('reschedule');
  const [slots, setSlots] = useState<SlotInput[] | null>(null);
  const [message, setMessage] = useState('');
  const [slotError, setSlotError] = useState<string | null>(null);

  if (lesson.isPending) return <LoadingState />;
  if (lesson.isError)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void lesson.refetch()} />;
  const l = lesson.data;

  const origDate = localDate(l.start_at, zone);
  const current = slots ?? [{ date: addDays(origDate, 1), time: localTime(l.start_at, zone) }];
  const isLate = !!deadline.data && new Date(deadline.data) < new Date();

  const updateSlot = (index: number, patch: Partial<SlotInput>) => {
    setSlotError(null);
    setSlots(current.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const submit = () => {
    let starts: string[] = [];
    if (kind === 'reschedule') {
      const result = buildSlotStarts(current, zone);
      if (!result.ok) {
        setSlotError(t(`validation.${result.error}`));
        return;
      }
      starts = result.starts;
    }
    create.mutate({ kind, message, starts }, { onSuccess: () => router.back() });
  };

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <AppText tone="muted">
        {formatDayLong(origDate, locale)}, {formatTimeRange(l.start_at, l.end_at, zone, locale)}
      </AppText>

      <Segmented
        label={t('requests.whatKind')}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'reschedule', label: t('requests.kind.reschedule') },
          { value: 'cancel', label: t('requests.kind.cancel') },
        ]}
      />

      {isLate ? (
        <AppText tone="danger" accessibilityLiveRegion="polite">
          {t('requests.lateHint', { deadline: formatStamp(deadline.data!, zone, locale) })}
        </AppText>
      ) : null}

      {kind === 'reschedule' ? (
        <Card title={t('requests.slots')}>
          <AppText variant="caption" tone="muted">
            {t('requests.slotsHint', { zone: zoneCity(zone) })}
          </AppText>
          {current.map((slot, i) => (
            <View key={i} style={styles.slot}>
              <AppText variant="bodyStrong">{t('requests.slot', { n: i + 1 })}</AppText>
              <DateField
                label={t('lessons.fields.date')}
                value={slot.date}
                today={todayIn(zone)}
                onChange={(date) => updateSlot(i, { date })}
              />
              <TextField
                label={t('lessons.fields.time')}
                value={slot.time}
                onChangeText={(time) => updateSlot(i, { time })}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                error={isValidLocalTime(slot.time) ? undefined : t('validation.invalid_time')}
              />
              {current.length > 1 ? (
                <Button
                  title={t('requests.removeSlot')}
                  variant="ghost"
                  onPress={() => setSlots(current.filter((_, j) => j !== i))}
                />
              ) : null}
            </View>
          ))}
          {current.length < MAX_SLOTS ? (
            <Button
              title={t('requests.addSlot')}
              variant="secondary"
              onPress={() => {
                const last = current[current.length - 1]!;
                setSlots([...current, { date: addDays(last.date, 1), time: last.time }]);
              }}
            />
          ) : null}
        </Card>
      ) : null}

      <TextField
        label={t('requests.message')}
        placeholder={t('requests.messagePlaceholder')}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={1000}
      />

      <FormMessage message={slotError ?? (create.error ? t(errorKey(create.error)) : undefined)} />
      <Button title={t('requests.send')} loading={create.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  slot: { gap: spacing.sm, paddingTop: spacing.sm },
});
