import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

export type Note = Pick<Tables<'notes'>, 'id' | 'body' | 'visibility' | 'created_at'>;
export type NoteVisibility = Enums<'note_visibility'>;

export const noteKeys = {
  student: (studentId: string) => ['notes', 'student', studentId] as const,
};

export function useStudentNotes(studentId: string) {
  return useQuery({
    queryKey: noteKeys.student(studentId),
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, body, visibility, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateNote(studentId: string, teacherId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { body: string; visibility: NoteVisibility }) => {
      const { error } = await supabase.from('notes').insert({
        student_id: studentId,
        teacher_id: teacherId,
        body: input.body.trim(),
        visibility: input.visibility,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.student(studentId) }),
  });
}

export function useDeleteNote(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.student(studentId) }),
  });
}
