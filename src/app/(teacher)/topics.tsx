import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  ErrorState,
  FormMessage,
  LoadingState,
  Screen,
  TextField,
} from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDeleteTag, useSaveTag, useTags, type Tag } from '@/features/tags/api';
import { TAG_COLOR_PRESETS } from '@/lib/colors';
import { confirmAsync } from '@/lib/confirm';
import { errorKey } from '@/lib/errors';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Draft = { id?: string; label: string; color: string };
const EMPTY_DRAFT: Draft = { label: '', color: TAG_COLOR_PRESETS[0] };

export default function TopicsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuth();
  const tags = useTags(session?.user.id);
  const save = useSaveTag(session?.user.id);
  const remove = useDeleteTag();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  if (tags.isPending) return <LoadingState />;
  if (tags.isError)
    return <ErrorState message={t('errors.loadFailed')} onRetry={() => void tags.refetch()} />;

  const label = draft.label.trim();
  const submit = () =>
    save.mutate({ id: draft.id, label, color: draft.color }, { onSuccess: () => setDraft(EMPTY_DRAFT) });

  const confirmDelete = async (tag: Tag) => {
    const ok = await confirmAsync({
      title: t('topics.deleteTitle', { label: tag.label }),
      message: t('topics.deleteMessage'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) remove.mutate(tag.id, { onSuccess: () => draft.id === tag.id && setDraft(EMPTY_DRAFT) });
  };

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <AppText tone="muted">{t('topics.subtitle')}</AppText>

      <Card title={draft.id ? t('common.edit') : t('topics.add')}>
        <TextField
          label={t('topics.label')}
          value={draft.label}
          onChangeText={(value) => setDraft((d) => ({ ...d, label: value }))}
          maxLength={40}
        />
        <AppText variant="label">{t('topics.color')}</AppText>
        <View style={styles.colors} accessibilityRole="radiogroup" accessibilityLabel={t('topics.color')}>
          {TAG_COLOR_PRESETS.map((color) => {
            const selected = draft.color === color;
            return (
              <Pressable
                key={color}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={color}
                onPress={() => setDraft((d) => ({ ...d, color }))}
                style={[
                  styles.swatch,
                  { backgroundColor: color, borderColor: selected ? colors.text : 'transparent' },
                ]}
              />
            );
          })}
        </View>
        {label ? <Chip label={label} color={draft.color} /> : null}
        <FormMessage message={save.error ? t(errorKey(save.error)) : undefined} />
        <View style={styles.actions}>
          {draft.id ? (
            <View style={styles.flex}>
              <Button title={t('common.cancel')} variant="secondary" onPress={() => setDraft(EMPTY_DRAFT)} />
            </View>
          ) : null}
          <View style={styles.flex}>
            <Button
              title={draft.id ? t('topics.save') : t('common.add')}
              disabled={!label}
              loading={save.isPending}
              onPress={submit}
            />
          </View>
        </View>
      </Card>

      <FormMessage message={remove.error ? t(errorKey(remove.error)) : undefined} />
      {tags.data.length === 0 ? <AppText tone="muted">{t('topics.empty')}</AppText> : null}
      {tags.data.map((tag) => (
        <View
          key={tag.id}
          style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <View style={styles.flex}>
            <Chip label={tag.label} color={tag.color} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('common.edit')}: ${tag.label}`}
            style={styles.iconButton}
            onPress={() => setDraft({ id: tag.id, label: tag.label, color: tag.color })}
          >
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('common.delete')}: ${tag.label}`}
            style={styles.iconButton}
            onPress={() => void confirmDelete(tag)}
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: 44, height: 44, borderRadius: radius.pill, borderWidth: 3 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
  },
  iconButton: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
