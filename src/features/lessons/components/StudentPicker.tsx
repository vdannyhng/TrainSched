import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Chip, ChipRow, TextField } from '@/components/ui';
import { normalizeSearch } from '@/lib/search';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme/tokens';

type Option = { id: string; first_name: string; last_name: string | null };

function useActiveStudents() {
  return useQuery({
    queryKey: ['students', 'picker'],
    queryFn: async (): Promise<Option[]> => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .neq('status', 'archived')
        .order('first_name')
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
}

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
};

/** Mehrfachauswahl von Schülern (≥ 2 = Gruppenunterricht). Ausgewählte stehen oben. */
export function StudentPicker({ value, onChange, error }: Props) {
  const { t } = useTranslation();
  const students = useActiveStudents();
  const [search, setSearch] = useState('');
  const needle = normalizeSearch(search);

  const all = students.data ?? [];
  const name = (s: Option) => [s.first_name, s.last_name].filter(Boolean).join(' ');
  const selected = all.filter((s) => value.includes(s.id));
  const others = all
    .filter((s) => !value.includes(s.id))
    .filter((s) => !needle || normalizeSearch(name(s)).includes(needle))
    .slice(0, needle ? 50 : 12);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <View style={styles.container}>
      <AppText variant="label">{t('lessons.fields.participants')}</AppText>
      <AppText variant="caption" tone="muted">
        {t('lessons.fields.participantsHint')}
      </AppText>
      {selected.length ? (
        <ChipRow>
          {selected.map((s) => (
            <Chip
              key={s.id}
              label={`✓ ${name(s)}`}
              selected
              onPress={() => toggle(s.id)}
              accessibilityLabel={name(s)}
            />
          ))}
        </ChipRow>
      ) : null}
      {all.length > 12 ? (
        <TextField
          label={t('lessons.fields.searchStudents')}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      ) : null}
      <ChipRow>
        {others.map((s) => (
          <Chip key={s.id} label={name(s)} selected={false} onPress={() => toggle(s.id)} />
        ))}
      </ChipRow>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
});
