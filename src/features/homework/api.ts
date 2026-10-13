import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Homework = Pick<
  Tables<'homework'>,
  | 'id'
  | 'lesson_id'
  | 'student_id'
  | 'title'
  | 'description'
  | 'due_date'
  | 'status'
  | 'done_at'
  | 'created_at'
> & { student: { first_name: string } | null };

const COLUMNS =
  'id, lesson_id, student_id, title, description, due_date, status, done_at, created_at, student:students(first_name)';

export const homeworkKeys = {
  all: ['homework'] as const,
  lesson: (id: string) => ['homework', 'lesson', id] as const,
  student: (id: string) => ['homework', 'student', id] as const,
  mine: ['homework', 'mine'] as const,
};

async function list(filter: { lessonId?: string; studentId?: string }): Promise<Homework[]> {
  let query = supabase
    .from('homework')
    .select(COLUMNS)
    .order('status')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200);
  if (filter.lessonId) query = query.eq('lesson_id', filter.lessonId);
  if (filter.studentId) query = query.eq('student_id', filter.studentId);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Homework[];
}

export function useLessonHomework(lessonId: string) {
  return useQuery({ queryKey: homeworkKeys.lesson(lessonId), queryFn: () => list({ lessonId }) });
}

export function useStudentHomework(studentId: string) {
  return useQuery({ queryKey: homeworkKeys.student(studentId), queryFn: () => list({ studentId }) });
}

/** Für Schüler: eigene Aufgaben (RLS filtert). */
export function useMyHomework(enabled: boolean) {
  return useQuery({ queryKey: homeworkKeys.mine, enabled, queryFn: () => list({}) });
}

export function useCreateHomework() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      teacherId: string;
      lessonId: string | null;
      studentIds: string[];
      title: string;
      description: string;
      dueDate: string | null;
    }) => {
      const { error } = await supabase.from('homework').insert(
        input.studentIds.map((student_id) => ({
          teacher_id: input.teacherId,
          lesson_id: input.lessonId,
          student_id,
          title: input.title.trim(),
          description: input.description.trim() || null,
          due_date: input.dueDate,
        })),
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homeworkKeys.all }),
  });
}

export function useSetHomeworkStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.rpc('set_homework_status', { p_homework_id: id, p_done: done });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homeworkKeys.all }),
  });
}

export function useDeleteHomework() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('homework').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homeworkKeys.all }),
  });
}

/** Überfällig = offen und Fälligkeitsdatum vor heute (lokales Datum). */
export function isOverdue(h: Pick<Homework, 'status' | 'due_date'>, today: string): boolean {
  return h.status === 'open' && !!h.due_date && h.due_date < today;
}
