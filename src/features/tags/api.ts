import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Tag = Pick<Tables<'tags'>, 'id' | 'label' | 'color'>;

export const tagKeys = {
  all: ['tags'] as const,
};

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('id, label, color').order('label');
  if (error) throw error;
  return data;
}

export function useTags() {
  return useQuery({ queryKey: tagKeys.all, queryFn: listTags });
}

export type TagInput = { label: string; color: string };

export function useSaveTag(teacherId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TagInput & { id?: string }) => {
      const values = { label: input.label.trim(), color: input.color };
      const { error } = id
        ? await supabase.from('tags').update(values).eq('id', id)
        : await supabase.from('tags').insert({ ...values, teacher_id: teacherId! });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tagKeys.all });
      // Zuordnungen verschwinden per Cascade → Schülerdaten neu laden.
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
