import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Level } from '@/lib/colors';
import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

export type Note = Pick<
  Tables<'notes'>,
  'id' | 'body' | 'visibility' | 'created_at' | 'lesson_id' | 'student_id'
>;
export type NoteVisibility = Enums<'note_visibility'>;

/** Ziel einer Notiz/eines Anhangs: genau ein Termin ODER ein Schüler. */
export type NoteTarget =
  { lessonId: string; studentId?: undefined } | { studentId: string; lessonId?: undefined };

export const noteKeys = {
  all: ['notes'] as const,
  target: (t: NoteTarget) => ['notes', t.lessonId ? 'lesson' : 'student', t.lessonId ?? t.studentId] as const,
  mine: ['notes', 'mine'] as const,
  search: (f: NoteSearchFilters) => ['notes', 'search', f] as const,
};

const NOTE_COLUMNS = 'id, body, visibility, created_at, lesson_id, student_id';

export function useNotes(target: NoteTarget) {
  return useQuery({
    queryKey: noteKeys.target(target),
    queryFn: async (): Promise<Note[]> => {
      let query = supabase
        .from('notes')
        .select(NOTE_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(50);
      query = target.lessonId
        ? query.eq('lesson_id', target.lessonId)
        : query.eq('student_id', target.studentId!);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/** Für Schüler: alle für sie freigegebenen Notizen (RLS filtert). */
export function useMyNotes(enabled: boolean) {
  return useQuery({
    queryKey: noteKeys.mine,
    enabled,
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select(NOTE_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateNote(target: NoteTarget, teacherId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { body: string; visibility: NoteVisibility }) => {
      const { error } = await supabase.from('notes').insert({
        teacher_id: teacherId!,
        lesson_id: target.lessonId ?? null,
        student_id: target.studentId ?? null,
        body: input.body.trim(),
        visibility: input.visibility,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

// ---------------------------------------------------------------------------
// Suche
// ---------------------------------------------------------------------------
export type NoteSearchFilters = {
  query: string;
  studentId: string | null;
  level: Level | null;
  tagId: string | null;
  from: string | null;
  to: string | null;
};

export type NoteSearchResult = {
  id: string;
  body: string;
  visibility: NoteVisibility;
  created_at: string;
  lesson_id: string | null;
  lesson_start_at: string | null;
  student_id: string | null;
  student_names: string | null;
};

const SEARCH_PAGE = 30;

export function useNoteSearch(filters: NoteSearchFilters) {
  return useInfiniteQuery({
    queryKey: noteKeys.search(filters),
    initialPageParam: 0,
    getNextPageParam: (last: NoteSearchResult[], pages) =>
      last.length < SEARCH_PAGE ? undefined : pages.length,
    queryFn: async ({ pageParam }): Promise<NoteSearchResult[]> => {
      const { data, error } = await supabase.rpc('search_notes', {
        p_query: filters.query,
        p_student_id: filters.studentId as string,
        p_level: filters.level as Level,
        p_tag_id: filters.tagId as string,
        p_from: filters.from as string,
        p_to: filters.to as string,
        p_limit: SEARCH_PAGE,
        p_offset: pageParam * SEARCH_PAGE,
      });
      if (error) throw error;
      return data as NoteSearchResult[];
    },
  });
}
