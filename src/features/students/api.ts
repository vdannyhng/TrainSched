import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Level } from '@/lib/colors';
import { escapeLike, normalizeSearch } from '@/lib/search';
import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

import { deleteAccount } from '../privacy/api';
import type { Tag } from '../tags/api';
import { toStudentRow, type StudentFormOutput } from './schemas';

export const PAGE_SIZE = 30;

export type StatusFilter = 'current' | Enums<'student_status'>;

export type StudentFilters = {
  search: string;
  status: StatusFilter;
  level: Level | null;
  tagId: string | null;
};

export type StudentListItem = Pick<
  Tables<'students'>,
  'id' | 'first_name' | 'last_name' | 'status' | 'current_level' | 'timezone' | 'profile_id'
> & { tags: Tag[] };

export type StudentDetail = Tables<'students'> & { tags: Tag[] };

type TagJoin = { tags: Tag | null }[];
const flattenTags = (rows: TagJoin): Tag[] =>
  rows.flatMap((r) => (r.tags ? [r.tags] : [])).sort((a, b) => a.label.localeCompare(b.label));

export const studentKeys = {
  all: ['students'] as const,
  list: (filters: StudentFilters) => ['students', 'list', filters] as const,
  detail: (id: string) => ['students', 'detail', id] as const,
  invitation: (id: string) => ['students', 'invitation', id] as const,
  mine: ['students', 'mine'] as const,
};

// ---------------------------------------------------------------------------
// Liste (paginiert, serverseitig gefiltert)
// ---------------------------------------------------------------------------
export async function listStudents(filters: StudentFilters, page: number): Promise<StudentListItem[]> {
  let query = supabase
    .from('students')
    .select(
      'id, first_name, last_name, status, current_level, timezone, profile_id, student_tags(tags(id, label, color))',
    )
    .order('first_name')
    .order('id')
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  query = filters.status === 'current' ? query.neq('status', 'archived') : query.eq('status', filters.status);
  if (filters.level) query = query.eq('current_level', filters.level);

  const search = normalizeSearch(filters.search);
  if (search) query = query.ilike('search_text', `%${escapeLike(search)}%`);

  if (filters.tagId) {
    const { data: tagged, error } = await supabase
      .from('student_tags')
      .select('student_id')
      .eq('tag_id', filters.tagId);
    if (error) throw error;
    query = query.in(
      'id',
      tagged.map((t) => t.student_id),
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map(({ student_tags, ...row }) => ({ ...row, tags: flattenTags(student_tags) }));
}

export function useStudentList(filters: StudentFilters) {
  return useInfiniteQuery({
    queryKey: studentKeys.list(filters),
    queryFn: ({ pageParam }) => listStudents(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage.length < PAGE_SIZE ? undefined : pages.length),
  });
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------
export async function getStudent(id: string): Promise<StudentDetail> {
  const { data, error } = await supabase
    .from('students')
    .select('*, student_tags(tags(id, label, color))')
    .eq('id', id)
    .single();
  if (error) throw error;
  const { student_tags, ...row } = data;
  return { ...row, tags: flattenTags(student_tags) };
}

export function useStudent(id: string) {
  return useQuery({ queryKey: studentKeys.detail(id), queryFn: () => getStudent(id) });
}

/** Für Schüler: der eigene Datensatz (Level, Ziel, Themen). */
export function useMyStudent(userId: string | undefined) {
  return useQuery({
    queryKey: studentKeys.mine,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, current_level, goal, student_tags(tags(id, label, color))')
        .eq('profile_id', userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        level: data.current_level,
        goal: data.goal,
        tags: flattenTags(data.student_tags),
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Schreiben
// ---------------------------------------------------------------------------
async function syncStudentTags(studentId: string, wanted: string[], current: string[]) {
  const toAdd = wanted.filter((id) => !current.includes(id));
  const toRemove = current.filter((id) => !wanted.includes(id));
  if (toRemove.length) {
    const { error } = await supabase
      .from('student_tags')
      .delete()
      .eq('student_id', studentId)
      .in('tag_id', toRemove);
    if (error) throw error;
  }
  if (toAdd.length) {
    const { error } = await supabase
      .from('student_tags')
      .insert(toAdd.map((tag_id) => ({ student_id: studentId, tag_id })));
    if (error) throw error;
  }
}

export function useCreateStudent(teacherId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: StudentFormOutput) => {
      const { data, error } = await supabase
        .from('students')
        .insert({ ...toStudentRow(values), teacher_id: teacherId! })
        .select('id')
        .single();
      if (error) throw error;
      await syncStudentTags(data.id, values.tagIds, []);
      return data.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useUpdateStudent(student: StudentDetail | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: StudentFormOutput) => {
      if (!student) throw new Error('student not loaded');
      const { error } = await supabase
        .from('students')
        .update(toStudentRow(values, student.guardian_consent_at))
        .eq('id', student.id);
      if (error) throw error;
      await syncStudentTags(
        student.id,
        values.tagIds,
        student.tags.map((t) => t.id),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    // Über die Edge Function: entfernt auch Dateien im Storage und das App-Login des Schülers
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: studentKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: studentKeys.all });
      // Einzeltermine/Serien des Schülers werden serverseitig mitgelöscht
      void queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Einladungen
// ---------------------------------------------------------------------------
export function useInvitationStatus(studentId: string, enabled: boolean) {
  return useQuery({
    queryKey: studentKeys.invitation(studentId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('student_invitation_status', { p_student_id: studentId });
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

export function useCreateInvitation(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_student_invitation', { p_student_id: studentId });
      if (error) throw error;
      const invitation = data[0];
      if (!invitation) throw new Error('no invitation returned');
      return invitation;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKeys.invitation(studentId) }),
  });
}

export function useCreateTeacherInvitation() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_teacher_invitation');
      if (error) throw error;
      const invitation = data[0];
      if (!invitation) throw new Error('no invitation returned');
      return invitation;
    },
  });
}
