import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Chip, ChipRow, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useStudentList, type StatusFilter, type StudentFilters } from '@/features/students/api';
import { StudentListItem } from '@/features/students/components/StudentListItem';
import { useTags } from '@/features/tags/api';
import { LEVEL_COLORS, LEVELS } from '@/lib/colors';
import { MIN_TOUCH, radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const STATUS_FILTERS: StatusFilter[] = ['current', 'active', 'inactive', 'archived'];
const INITIAL_FILTERS: StudentFilters = { search: '', status: 'current', level: null, tagId: null };

export default function StudentsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [filters, setFilters] = useState<StudentFilters>(INITIAL_FILTERS);
  // Suche erst nach dem Tippen auslösen, Filter-Chips sofort.
  const deferredSearch = useDeferredValue(filters.search);
  const query = useStudentList({ ...filters, search: deferredSearch });
  const tags = useTags();

  const students = query.data?.pages.flat() ?? [];
  const filtersActive =
    filters.search !== '' || filters.status !== 'current' || filters.level !== null || filters.tagId !== null;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <AppText variant="title" style={styles.flex}>
          {t('students.title')}
        </AppText>
        <Pressable
          onPress={() => router.push('/topics')}
          accessibilityRole="button"
          style={styles.headerButton}
          hitSlop={4}
        >
          <Ionicons name="pricetags-outline" size={20} color={colors.primary} />
          <AppText tone="primary" variant="label">
            {t('students.manageTopics')}
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => router.push('/student/new')}
          accessibilityRole="button"
          accessibilityLabel={t('students.new')}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={28} color={colors.onPrimary} />
        </Pressable>
      </View>

      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} accessibilityElementsHidden />
        <TextInput
          value={filters.search}
          onChangeText={(search) => setFilters((f) => ({ ...f, search }))}
          placeholder={t('students.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('students.searchPlaceholder')}
          autoCorrect={false}
          returnKeyType="search"
          style={[typography.body, styles.searchInput, { color: colors.text }]}
        />
      </View>

      <ChipRow>
        {STATUS_FILTERS.map((status) => (
          <Chip
            key={status}
            label={t(`status.${status}`)}
            selected={filters.status === status}
            onPress={() => setFilters((f) => ({ ...f, status }))}
          />
        ))}
      </ChipRow>
      <ChipRow>
        {LEVELS.map((level) => (
          <Chip
            key={level}
            label={level}
            color={LEVEL_COLORS[level]}
            selected={filters.level === level}
            onPress={() => setFilters((f) => ({ ...f, level: f.level === level ? null : level }))}
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
    </View>
  );

  const empty = query.isPending ? (
    <LoadingState />
  ) : query.isError ? (
    <ErrorState message={t('errors.loadFailed')} onRetry={() => void query.refetch()} />
  ) : filtersActive ? (
    <EmptyState
      icon="search-outline"
      title={t('students.noResults')}
      action={
        <Button
          title={t('students.resetFilters')}
          variant="secondary"
          onPress={() => setFilters(INITIAL_FILTERS)}
        />
      }
    />
  ) : (
    <EmptyState
      icon="people-outline"
      title={t('students.emptyTitle')}
      message={t('students.emptyMessage')}
      action={<Button onPress={() => router.push('/student/new')} title={t('students.new')} />}
    />
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <FlashList
        data={students}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <StudentListItem student={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg },
  header: { gap: spacing.md, marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.sm,
  },
  addButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm },
  separator: { height: spacing.sm },
});
