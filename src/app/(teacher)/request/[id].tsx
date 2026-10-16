import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ErrorState,
  FormMessage,
  LoadingState,
  Screen,
  TextField,
} from '@/components/ui';
import { checkConflicts, lessonLabel, useLesson, type Conflict } from '@/features/lessons/api';
import { useDecideRequest, useRequest } from '@/features/requests/api';
import { RequestSummary, useSlotFormatter } from '@/features/requests/components/RequestSummary';
import { errorKey } from '@/lib/errors';
import { addMinutesIso, durationMinutes } from '@/lib/time';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Lehrer: Anfrage prüfen – Slot wählen (mit Konfliktanzeige) und annehmen, oder ablehnen. */
export default function RequestDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = useRequest(id);
  const lesson = useLesson(request.data?.lesson_id ?? '');
  const decide = useDecideRequest(id);
  const formatSlot = useSlotFormatter();
  const [chosen, setChosen] = useState<string | null>(null);
  const [response, setResponse] = useState('');

  const r = request.data;
  const l = lesson.data;
  const minutes = l ? durationMinutes(l.start_at, l.end_at) : 60;
  const pending = r?.status === 'pending';

  const conflicts = useQuery({
    queryKey: ['requests', 'conflicts', id, minutes],
    enabled: !!r && !!l && pending && r.kind === 'reschedule',
    queryFn: () =>
      checkConflicts(
        l!.teacher_id,
        r!.proposed_starts.map((start) => ({ start, end: addMinutesIso(start, minutes) })),
        [l!.id],
      ),
  });

  if (request.isPending || (r && lesson.isPending)) return <LoadingState />;
  if (request.isError || !r)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void request.refetch()} />;

  const lessonOpen = l?.status === 'scheduled';
  const isGroup = (l?.participants.length ?? 0) > 1;
  const canAccept = pending && lessonOpen && (r.kind === 'cancel' || !!chosen);
  const send = (accept: boolean) =>
    decide.mutate(
      { accept, chosenStart: accept && r.kind === 'reschedule' ? chosen : null, response },
      { onSuccess: () => router.back() },
    );

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      {l ? (
        <Pressable accessibilityRole="link" onPress={() => router.push(`/lesson/${l.id}`)}>
          <AppText variant="heading">{lessonLabel(l)}</AppText>
          <AppText tone="primary">{formatSlot(l.start_at, minutes)}</AppText>
        </Pressable>
      ) : null}

      <Card>
        <RequestSummary request={r} showStudent hideSlots={pending} />
        {pending && r.is_late ? <AppText tone="danger">{t('requests.lateTeacher')}</AppText> : null}
      </Card>

      {pending && !lessonOpen ? <AppText tone="danger">{t('requests.lessonClosed')}</AppText> : null}

      {pending && r.kind === 'reschedule' ? (
        <Card title={t('requests.pickSlot')}>
          {r.proposed_starts.map((start, index) => (
            <SlotOption
              key={start}
              label={formatSlot(start, minutes)}
              selected={chosen === start}
              conflicts={(conflicts.data ?? []).filter((c) => c.range_index === index + 1)}
              checking={conflicts.isPending}
              onPress={() => setChosen(start)}
            />
          ))}
        </Card>
      ) : null}

      {pending && r.kind === 'cancel' && isGroup ? (
        <AppText tone="muted">{t('requests.groupCancelHint')}</AppText>
      ) : null}

      {pending ? (
        <>
          <TextField
            label={t('requests.response')}
            hint={t('requests.responseHint')}
            value={response}
            onChangeText={setResponse}
            multiline
            maxLength={1000}
          />
          <FormMessage message={decide.error ? t(errorKey(decide.error)) : undefined} />
          <View style={styles.actions}>
            <Button
              title={t('requests.accept')}
              disabled={!canAccept}
              loading={decide.isPending && decide.variables?.accept === true}
              onPress={() => send(true)}
            />
            <Button
              title={t('requests.decline')}
              variant="secondary"
              loading={decide.isPending && decide.variables?.accept === false}
              onPress={() => send(false)}
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function SlotOption({
  label,
  selected,
  conflicts,
  checking,
  onPress,
}: {
  label: string;
  selected: boolean;
  conflicts: Conflict[];
  checking: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const hard = conflicts.some((c) => c.kind === 'overlap' || c.kind === 'blocker');
  const statusText = checking
    ? t('common.loading')
    : conflicts.length === 0
      ? t('requests.free')
      : conflicts.map((c) => t(`requests.conflict.${c.kind}`, { label: c.label ?? '–' })).join(' · ');

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}, ${statusText}`}
      onPress={onPress}
      style={[
        styles.slot,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.surfaceMuted : colors.surface,
        },
      ]}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.primary : colors.textMuted}
      />
      <View style={styles.slotText}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText
          variant="caption"
          tone={checking ? 'muted' : conflicts.length === 0 ? 'success' : hard ? 'danger' : 'muted'}
        >
          {statusText}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: MIN_TOUCH,
  },
  slotText: { flex: 1, gap: 2 },
});
