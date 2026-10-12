import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  ChipRow,
  FormMessage,
  InfoRow,
  Screen,
  Segmented,
} from '@/components/ui';
import { signOut, updateProfileLocale } from '@/features/auth/api';
import { profileQueryKey, useAuth } from '@/features/auth/AuthProvider';
import { useTeachers, useTeacherSettings, useUpdateBuffer } from '@/features/settings/api';
import { AccessToggle } from '@/features/settings/components/AccessToggle';
import { useCreateTeacherInvitation, useMyStudent } from '@/features/students/api';
import { InvitationCodeBox } from '@/features/students/components/InviteCard';
import { SUPPORTED_LOCALES, type AppLocale } from '@/i18n';
import { LEVEL_COLORS } from '@/lib/colors';
import { errorKey } from '@/lib/errors';
import { spacing } from '@/theme/tokens';

/** Konto-Screen für alle Rollen: Profilinfos, Sprache, Abmelden (+ rollenspezifische Karten). */
export function AccountScreen() {
  const { t } = useTranslation();
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const setLocale = useMutation({
    mutationFn: (locale: AppLocale) => updateProfileLocale(userId!, locale),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) }),
  });
  const signOutMutation = useMutation({ mutationFn: signOut });

  if (!profile) return null;

  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <AppText variant="title">{t('account.title')}</AppText>

      <Card>
        <InfoRow label={t('account.name')} value={profile.display_name || '–'} />
        <InfoRow label={t('auth.email')} value={profile.email ?? '–'} />
        <InfoRow label={t('account.role')} value={t(`account.roles.${profile.role}`)} />
        <InfoRow label={t('account.timezone')} value={profile.timezone} />
      </Card>

      {profile.role === 'student' ? <MyCourseCard userId={userId} /> : null}

      <Segmented
        label={t('account.language')}
        value={profile.locale}
        disabled={setLocale.isPending}
        onChange={(locale) => setLocale.mutate(locale)}
        options={SUPPORTED_LOCALES.map((locale) => ({
          value: locale,
          label: t(`account.languages.${locale}`),
        }))}
      />
      <FormMessage message={setLocale.error ? t(errorKey(setLocale.error)) : undefined} />

      {profile.role !== 'student' ? <TeachingCard teacherId={userId} /> : null}
      {profile.role === 'admin' ? <InviteTeacherCard /> : null}
      {profile.role === 'admin' ? <TeachersCard selfId={userId} /> : null}

      <View style={styles.spacer} />
      <Button
        title={t('auth.signOut')}
        variant="secondary"
        loading={signOutMutation.isPending}
        onPress={() => signOutMutation.mutate()}
      />
    </Screen>
  );
}

function MyCourseCard({ userId }: { userId: string | undefined }) {
  const { t } = useTranslation();
  const mine = useMyStudent(userId);
  if (!mine.data) return null;
  const { level, goal, tags } = mine.data;
  return (
    <Card title={t('account.myCourse')}>
      {level ? (
        <InfoRow label={t('levels.current')} value={<Chip label={level} color={LEVEL_COLORS[level]} />} />
      ) : null}
      {goal ? <InfoRow label={t('account.goal')} value={goal} /> : null}
      {tags.length ? (
        <InfoRow
          label={t('account.topics')}
          value={
            <ChipRow>
              {tags.map((tag) => (
                <Chip key={tag.id} label={tag.label} color={tag.color} />
              ))}
            </ChipRow>
          }
        />
      ) : null}
    </Card>
  );
}

const BUFFER_OPTIONS = [0, 10, 15, 30] as const;

function TeachingCard({ teacherId }: { teacherId: string | undefined }) {
  const { t } = useTranslation();
  const settings = useTeacherSettings(teacherId);
  const update = useUpdateBuffer(teacherId);
  if (!settings.data) return null;
  return (
    <Card title={t('settings.teaching')}>
      <Segmented
        label={t('settings.buffer')}
        value={String(settings.data.buffer_minutes)}
        disabled={update.isPending}
        onChange={(v) => update.mutate(Number(v))}
        options={BUFFER_OPTIONS.map((m) => ({ value: String(m), label: t('common.minutes', { count: m }) }))}
      />
      <AppText variant="caption" tone="muted">
        {t('settings.bufferHint')}
      </AppText>
      <FormMessage message={update.error ? t(errorKey(update.error)) : undefined} />
    </Card>
  );
}

function TeachersCard({ selfId }: { selfId: string | undefined }) {
  const { t } = useTranslation();
  const teachers = useTeachers(true);
  const others = (teachers.data ?? []).filter((p) => p.id !== selfId);
  return (
    <Card title={t('access.teachers')}>
      {others.length === 0 ? <AppText tone="muted">{t('access.noTeachers')}</AppText> : null}
      {others.map((p) => (
        <View key={p.id} style={styles.teacher}>
          <InfoRow label={p.email ?? ''} value={p.display_name || p.email || '–'} />
          <AccessToggle profileId={p.id} pausedAt={p.access_paused_at} />
        </View>
      ))}
    </Card>
  );
}

function InviteTeacherCard() {
  const { t } = useTranslation();
  const invite = useCreateTeacherInvitation();
  return (
    <Card title={t('account.inviteTeacher.title')}>
      <AppText tone="muted">{t('account.inviteTeacher.hint')}</AppText>
      {invite.data ? <InvitationCodeBox invitation={invite.data} recipientName="" /> : null}
      <FormMessage message={invite.error ? t(errorKey(invite.error)) : undefined} />
      <Button
        title={t('account.inviteTeacher.create')}
        variant={invite.data ? 'secondary' : 'primary'}
        loading={invite.isPending}
        onPress={() => invite.mutate()}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  spacer: { flex: 1, minHeight: spacing.lg },
  teacher: { gap: spacing.sm, paddingTop: spacing.sm },
});
