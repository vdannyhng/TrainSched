import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, FormMessage } from '@/components/ui';
import { confirmAsync } from '@/lib/confirm';
import { errorKey } from '@/lib/errors';

import { signOutLocal, type Profile } from '../auth/api';
import { deleteAccount, shareExport } from './api';

/** Konto: Datenexport, Datenschutzerklärung, Konto löschen (Admin ausgenommen). */
export function DataCard({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const exportData = useMutation({ mutationFn: shareExport });
  const remove = useMutation({
    mutationFn: async () => {
      await deleteAccount();
      await signOutLocal();
    },
  });

  const confirmDelete = async () => {
    const ok = await confirmAsync({
      title: t('data.deleteTitle'),
      message: profile.role === 'student' ? t('data.deleteStudent') : t('data.deleteTeacher'),
      confirmLabel: t('data.deleteConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) remove.mutate();
  };

  return (
    <Card title={t('data.title')}>
      <Button
        title={t('data.export')}
        variant="secondary"
        loading={exportData.isPending}
        onPress={() => exportData.mutate()}
      />
      <AppText variant="caption" tone="muted">
        {t('data.exportHint')}
      </AppText>
      <FormMessage message={exportData.error ? t('errors.exportFailedData') : undefined} />

      <Button title={t('privacy.read')} variant="ghost" onPress={() => router.push('/privacy')} />

      {profile.role === 'admin' ? (
        <AppText variant="caption" tone="muted">
          {t('data.adminHint')}
        </AppText>
      ) : (
        <>
          <FormMessage message={remove.error ? t(errorKey(remove.error)) : undefined} />
          <Button
            title={t('data.delete')}
            variant="danger"
            loading={remove.isPending}
            onPress={() => void confirmDelete()}
          />
        </>
      )}
    </Card>
  );
}
