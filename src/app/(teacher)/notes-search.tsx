import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Chip, ChipRow, EmptyState, ErrorState, LoadingState, MarkdownText } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { DateField } from '@/features/lessons/components/DateField';
import { useLocale, useViewerZone } from '@/features/lessons/hooks';
import { useNoteSearch, type NoteSearchFilters, type NoteSearchResult } from '@/features/notes/api';
import { useTags } from '@/features/tags/api';
import { LEVEL_COLORS, LEVELS } from '@/lib/colors';
import { formatDayShort, localDate, todayIn } from '@/lib/time';
import { MIN_TOUCH, radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Volltextsuche über Notizen (diakritik-tolerant) mit Filtern nach Schüler, Level, Thema, Zeitraum. */
export default function NotesSearchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuth();
  const zone = useViewerZone();
  const locale = useLocale();
  const params = useLocalSearchParams<{ studentId?: string; name?: string }>();
  const tags = useTags(session?.user.id);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Omit<NoteSearchFilters, 'query'>>({
    studentId: params.studentId ?? null,
    level: null,
    tagId: null,
    from: null,
    to: null,
  });
  const deferredQuery = useDeferredValue(query);
  const search = useNoteSearch({ ...filters, query: deferredQuery });
  const results = search.data?.pages.flat() ?? [];

  const header = (
    <View style={styles.header}>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} accessibilityElementsHidden />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('notes.search.placeholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('notes.search.placeholder')}
          autoCorrect={false}
          autoFocus
          style={[typography.body, styles.input, { color: colors.text }]}
        />
      </View>
      {filters.studentId && params.name ? (
        <ChipRow>
          <Chip
            label={`✕ ${t('notes.search.studentFilter', { name: params.name })}`}
            selected
            onPress={() => setFilters((f) => ({ ...f, studentId: null }))}
          />
        </ChipRow>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ChipRow>
          {LEVELS.map((l) => (
            <Chip
              key={l}
              label={l}
              color={LEVEL_COLORS[l]}
              selected={filters.level === l}
              onPress={() => setFilters((f) => ({ ...f, level: f.level === l ? null : l }))}
            />
          ))}
          {tags.data?.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.label}
              color={tag.color}
              selected={filters.tagId === tag.id}
              onPress={() => setFilters((f) => ({ ...f, tagId: f.tagId === tag.id ? null : tag.id }))}
            />
          ))}
        </ChipRow>
      </ScrollView>
      <View style={styles.dates}>
        <View style={styles.flex}>
          <DateField
            label={t('notes.search.from')}
            value={filters.from ?? ''}
            today={todayIn(zone)}
            onChange={(from) => setFilters((f) => ({ ...f, from }))}
            onClear={() => setFilters((f) => ({ ...f, from: null }))}
            placeholder="–"
          />
        </View>
        <View style={styles.flex}>
          <DateField
            label={t('notes.search.to')}
            value={filters.to ?? ''}
            today={todayIn(zone)}
            onChange={(to) => setFilters((f) => ({ ...f, to }))}
            onClear={() => setFilters((f) => ({ ...f, to: null }))}
            placeholder="–"
          />
        </View>
      </View>
    </View>
  );

  const open = (r: NoteSearchResult) => {
    if (r.lesson_id) router.push(`/lesson/${r.lesson_id}`);
    else if (r.student_id) router.push(`/student/${r.student_id}`);
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlashList
        data={results}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => open(item)}
            style={({ pressed }) => [
              styles.result,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={styles.resultHeader}>
              <Ionicons
                name={item.visibility === 'student' ? 'eye-outline' : 'lock-closed-outline'}
                size={14}
                color={colors.textMuted}
                accessibilityElementsHidden
              />
              <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.flex}>
                {formatDayShort(localDate(item.lesson_start_at ?? item.created_at, zone), locale)}
                {item.student_names ? ` · ${item.student_names}` : ''}
              </AppText>
            </View>
            <MarkdownText text={item.body} numberOfLines={4} />
          </Pressable>
        )}
        ListEmptyComponent={
          search.isPending ? (
            <LoadingState />
          ) : search.isError ? (
            <ErrorState message={t('errors.loadFailed')} onRetry={() => void search.refetch()} />
          ) : (
            <EmptyState icon="document-text-outline" title={t('notes.search.noResults')} />
          )
        }
        ListFooterComponent={search.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
        onEndReached={() => {
          if (search.hasNextPage && !search.isFetchingNextPage) void search.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg },
  header: { gap: spacing.md, marginBottom: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH,
  },
  input: { flex: 1, paddingVertical: spacing.sm },
  dates: { flexDirection: 'row', gap: spacing.sm },
  result: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
