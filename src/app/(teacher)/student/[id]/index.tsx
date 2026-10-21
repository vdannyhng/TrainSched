import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  ChipRow,
  ErrorState,
  InfoRow,
  LoadingState,
  Screen,
} from '@/components/ui';
import { AttachmentsSection } from '@/features/attachments/components/AttachmentsSection';
import { StudentHomeworkCard } from '@/features/homework/components/StudentHomeworkCard';
import { NotesSection } from '@/features/notes/components/NotesSection';
import { ProgressCard } from '@/features/progress/components/ProgressCard';
import { useCreateInvitation, useInvitationStatus, useStudent } from '@/features/students/api';
import { InviteCard } from '@/features/students/components/InviteCard';
import { AccessToggle } from '@/features/settings/components/AccessToggle';
import { LEVEL_COLORS } from '@/lib/colors';
import { todayIn } from '@/lib/time';
import { nowInZone, timezoneCity } from '@/lib/timezones';
import { MIN_TOUCH, spacing } from '@/theme/tokens';

export default function StudentDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const student = useStudent(id);
  const linked = !!student.data?.profile_id;
  const invitation = useInvitationStatus(id, !!student.data && !linked);
  const createInvitation = useCreateInvitation(id);

  if (student.isPending) return <LoadingState />;
  if (student.isError)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void student.refetch()} />;

  const s = student.data;
  const name = [s.first_name, s.last_name].filter(Boolean).join(' ');

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: name,
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/student/${s.id}/edit`)}
              accessibilityRole="button"
              style={styles.headerButton}
              hitSlop={8}
            >
              <AppText tone="primary" variant="bodyStrong">
                {t('common.edit')}
              </AppText>
            </Pressable>
          ),
        }}
      />

      <View style={styles.hero}>
        <AppText variant="title">{name}</AppText>
        <ChipRow>
          {s.current_level ? <Chip label={s.current_level} color={LEVEL_COLORS[s.current_level]} /> : null}
          <Chip label={t(`status.${s.status}`)} selected={false} />
          {s.tags.map((tag) => (
            <Chip key={tag.id} label={tag.label} color={tag.color} />
          ))}
        </ChipRow>
        <AppText tone="muted">
          {t('students.localTime', {
            time: nowInZone(s.timezone, i18n.language),
            city: timezoneCity(s.timezone),
          })}
        </AppText>
      </View>

      <Button
        title={t('lessons.planForStudent')}
        onPress={() => router.push({ pathname: '/lesson/new', params: { studentId: s.id } })}
      />

      <Card title={t('students.sections.learning')}>
        {s.goal ? <InfoRow label={t('students.fields.goal')} value={s.goal} /> : null}
        <InfoRow label={t('levels.label')} value={`${s.start_level ?? '–'} → ${s.current_level ?? '–'}`} />
      </Card>

      <ProgressCard studentId={s.id} forTeacher />

      {s.email || s.phone ? (
        <Card title={t('students.sections.contact')}>
          {s.email ? (
            <ContactRow label={t('students.fields.email')} value={s.email} url={`mailto:${s.email}`} />
          ) : null}
          {s.phone ? (
            <ContactRow label={t('students.fields.phone')} value={s.phone} url={`tel:${s.phone}`} />
          ) : null}
        </Card>
      ) : null}

      {s.is_minor ? (
        <Card title={t('students.sections.guardian')}>
          {s.guardian_name ? <InfoRow label={t('students.guardianName')} value={s.guardian_name} /> : null}
          {s.guardian_email ? (
            <ContactRow
              label={t('students.guardianEmail')}
              value={s.guardian_email}
              url={`mailto:${s.guardian_email}`}
            />
          ) : null}
          {s.guardian_phone ? (
            <ContactRow
              label={t('students.guardianPhone')}
              value={s.guardian_phone}
              url={`tel:${s.guardian_phone}`}
            />
          ) : null}
          <AppText tone={s.guardian_consent_at ? 'success' : 'danger'}>
            {s.guardian_consent_at ? '✓ ' : '✗ '}
            {t('students.guardianConsent')}
          </AppText>
        </Card>
      ) : null}

      <InviteCard
        linked={linked}
        pendingUntil={invitation.data?.expires_at}
        recipientName={s.first_name}
        created={createInvitation.data}
        creating={createInvitation.isPending}
        error={createInvitation.error}
        onCreate={() => createInvitation.mutate()}
        linkedContent={s.profile_id ? <AccessToggle profileId={s.profile_id} /> : undefined}
      />

      <StudentHomeworkCard studentId={s.id} today={todayIn(s.timezone)} />
      <NotesSection target={{ studentId: s.id }} teacherId={s.teacher_id} />
      <AttachmentsSection target={{ studentId: s.id }} teacherId={s.teacher_id} />
      <Button
        title={t('notes.search.title')}
        variant="ghost"
        onPress={() =>
          router.push({ pathname: '/notes-search', params: { studentId: s.id, name: s.first_name } })
        }
      />
    </Screen>
  );
}

function ContactRow({ label, value, url }: { label: string; value: string; url: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void Linking.openURL(url).catch(() => undefined)}
      style={styles.contact}
    >
      <InfoRow label={label} value={<AppText tone="primary">{value}</AppText>} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm },
  headerButton: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.sm },
  contact: { minHeight: MIN_TOUCH, justifyContent: 'center' },
});
