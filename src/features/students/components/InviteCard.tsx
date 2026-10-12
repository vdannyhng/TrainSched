import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, FormMessage } from '@/components/ui';
import { formatInviteCode } from '@/features/auth/schemas';
import { errorKey } from '@/lib/errors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type CreatedInvitation = { code: string; expires_at: string };

export function formatDate(iso: string, locale: string) {
  return DateTime.fromISO(iso).setLocale(locale).toLocaleString(DateTime.DATE_MED);
}

/** Zeigt einen frisch erzeugten Code einmalig an – mit Kopieren und Teilen. */
export function InvitationCodeBox({
  invitation,
  recipientName,
}: {
  invitation: CreatedInvitation;
  recipientName: string;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const code = formatInviteCode(invitation.code);
  const link = Linking.createURL('invite', { queryParams: { code: invitation.code } });

  return (
    <View style={[styles.codeBox, { borderColor: colors.primary, backgroundColor: colors.surfaceMuted }]}>
      <AppText variant="label" tone="muted">
        {t('students.invite.codeLabel')}
      </AppText>
      <AppText variant="title" selectable accessibilityLabel={code.split('').join(' ')}>
        {code}
      </AppText>
      <AppText variant="caption" tone="muted">
        {t('students.invite.validUntil', { date: formatDate(invitation.expires_at, i18n.language) })}{' '}
        {t('students.invite.onlyOnce')}
      </AppText>
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button
            title={copied ? t('common.copied') : t('common.copy')}
            variant="secondary"
            onPress={async () => {
              await Clipboard.setStringAsync(code);
              setCopied(true);
            }}
          />
        </View>
        <View style={styles.flex}>
          <Button
            title={t('common.share')}
            onPress={() =>
              Share.share({
                message: t('students.invite.shareMessage', {
                  name: recipientName ? ` ${recipientName}` : '',
                  code,
                  link,
                }),
              }).catch(() => undefined)
            }
          />
        </View>
      </View>
    </View>
  );
}

type Props = {
  linked: boolean;
  pendingUntil: string | null | undefined;
  recipientName: string;
  created: CreatedInvitation | undefined;
  creating: boolean;
  error: unknown;
  onCreate: () => void;
};

export function InviteCard({
  linked,
  pendingUntil,
  recipientName,
  created,
  creating,
  error,
  onCreate,
}: Props) {
  const { t, i18n } = useTranslation();

  return (
    <Card title={t('students.sections.appAccess')}>
      {linked ? (
        <AppText tone="success">{t('students.invite.linked')}</AppText>
      ) : (
        <>
          {!created ? (
            <AppText tone="muted">
              {pendingUntil
                ? t('students.invite.pending', { date: formatDate(pendingUntil, i18n.language) })
                : t('students.invite.none')}
            </AppText>
          ) : null}
          {created ? <InvitationCodeBox invitation={created} recipientName={recipientName} /> : null}
          <FormMessage message={error ? t(errorKey(error)) : undefined} />
          <Button
            title={pendingUntil || created ? t('students.invite.renew') : t('students.invite.create')}
            variant={created ? 'secondary' : 'primary'}
            loading={creating}
            onPress={onCreate}
          />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  codeBox: { borderWidth: 1.5, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
