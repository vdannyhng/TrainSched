import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, ErrorState, LoadingState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import type { Tables } from '@/types/database';

type Entry = Tables<'audit_log'>;

const LIMIT = 30;

/** Admin: die letzten Verwaltungsaktionen (Protokoll wird serverseitig per Trigger geschrieben). */
export function AuditLogCard() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const log = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(LIMIT);
      if (error) throw error;
      const entries = data as Entry[];
      // Namen der Beteiligten (Admin darf alle Profile lesen); gelöschte Konten bleiben ohne Namen
      const ids = [
        ...new Set(entries.flatMap((e) => [e.actor_id, e.target_type === 'profile' ? e.target_id : null])),
      ].filter((id): id is string => !!id);
      const { data: people } = ids.length
        ? await supabase.from('profiles').select('id, display_name, email').in('id', ids)
        : { data: [] };
      const names = new Map((people ?? []).map((p) => [p.id, p.display_name || p.email || '…']));
      return { entries, names };
    },
  });

  const name = (id: string | null, names: Map<string, string>) =>
    id ? (names.get(id) ?? t('audit.deletedAccount')) : t('audit.system');

  return (
    <Card title={t('audit.title')}>
      <AppText variant="caption" tone="muted">
        {t('audit.hint')}
      </AppText>
      {log.isPending ? (
        <LoadingState />
      ) : log.isError ? (
        <ErrorState message={t('errors.loadFailed')} onRetry={() => void log.refetch()} />
      ) : log.data.entries.length === 0 ? (
        <AppText tone="muted">{t('audit.empty')}</AppText>
      ) : (
        log.data.entries.map((e) => (
          <View key={e.id} style={[styles.row, { borderColor: colors.border }]}>
            <AppText variant="bodyStrong">
              {t(`audit.actions.${e.action as AuditAction}`)}
              {e.target_type === 'profile' ? `: ${name(e.target_id, log.data.names)}` : ''}
            </AppText>
            <AppText variant="caption" tone="muted">
              {DateTime.fromISO(e.created_at).setLocale(i18n.language).toLocaleString(DateTime.DATETIME_MED)}{' '}
              · {t('audit.by', { name: name(e.actor_id, log.data.names) })}
            </AppText>
          </View>
        ))
      )}
    </Card>
  );
}

type AuditAction =
  | 'access_paused'
  | 'access_resumed'
  | 'role_changed'
  | 'invitation_created'
  | 'invitation_revoked'
  | 'invitation_redeemed'
  | 'student_deleted'
  | 'account_deleted';

const styles = StyleSheet.create({
  row: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: 2 },
});
