import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Card, EmptyState, ErrorState, LoadingState, MarkdownText } from '@/components/ui';
import { useMyAttachments } from '@/features/attachments/api';
import { AttachmentRow } from '@/features/attachments/components/AttachmentsSection';
import { useMyNotes } from '@/features/notes/api';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Schüler: freigegebene Notizen und Dateien der Lehrerin an einem Ort. */
export default function MaterialsScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const notes = useMyNotes(true);
  const files = useMyAttachments(true);
  const loading = notes.isPending || files.isPending;
  const failed = notes.isError || files.isError;
  const empty = !loading && !failed && !notes.data?.length && !files.data?.length;

  const refresh = () => {
    void notes.refetch();
    void files.refetch();
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={notes.isRefetching || files.isRefetching} onRefresh={refresh} />
        }
      >
        <AppText variant="title">{t('tabs.materials')}</AppText>
        {loading ? (
          <LoadingState />
        ) : failed ? (
          <ErrorState message={t('errors.loadFailed')} onRetry={refresh} />
        ) : empty ? (
          <EmptyState
            icon="folder-open-outline"
            title={t('student.materials.emptyTitle')}
            message={t('materials.empty')}
          />
        ) : (
          <>
            {files.data?.length ? (
              <Card title={t('materials.files')}>
                {files.data.map((a) => (
                  <AttachmentRow key={a.id} attachment={a} editable={false} />
                ))}
              </Card>
            ) : null}
            {notes.data?.length ? (
              <Card title={t('materials.notes')}>
                {notes.data.map((n) => (
                  <View key={n.id} style={[styles.note, { borderColor: colors.border }]}>
                    <AppText variant="caption" tone="muted">
                      {DateTime.fromISO(n.created_at)
                        .setLocale(i18n.language)
                        .toLocaleString(DateTime.DATE_MED)}
                    </AppText>
                    <MarkdownText text={n.body} />
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  note: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: spacing.xs },
});
