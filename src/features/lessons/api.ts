import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Level } from '@/lib/colors';
import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

import type { Tag } from '../tags/api';

export type LessonStatus = Enums<'lesson_status'>;
export type LessonFormat = Enums<'lesson_format'>;
export type Attendance = Enums<'attendance_status'>;
export type Frequency = Enums<'series_frequency'>;

export type LessonParticipant = {
  student_id: string;
  attendance: Attendance;
  student: { first_name: string; last_name: string | null; timezone: string } | null;
};

export type Lesson = Tables<'lessons'> & {
  participants: LessonParticipant[];
  tags: Tag[];
};

export type LessonSeries = Pick<Tables<'lesson_series'>, 'id' | 'frequency' | 'start_date' | 'end_date'>;

const LESSON_SELECT =
  '*, lesson_participants(student_id, attendance, students(first_name, last_name, timezone)), lesson_tags(tags(id, label, color))';

type RawLesson = Tables<'lessons'> & {
  lesson_participants: {
    student_id: string;
    attendance: Attendance;
    students: LessonParticipant['student'];
  }[];
  lesson_tags: { tags: Tag | null }[];
};

function mapLesson({ lesson_participants, lesson_tags, ...row }: RawLesson): Lesson {
  return {
    ...row,
    participants: lesson_participants
      .map((p) => ({ student_id: p.student_id, attendance: p.attendance, student: p.students }))
      .sort((a, b) => (a.student?.first_name ?? '').localeCompare(b.student?.first_name ?? '')),
    tags: lesson_tags.flatMap((t) => (t.tags ? [t.tags] : [])),
  };
}

/**
 * Anzeigename: Titel oder Vornamen der Teilnehmenden.
 * Für Schüler (`studentFallback`) nie der eigene Name, sondern z. B. „Unterricht“.
 */
export function lessonLabel(
  lesson: Pick<Lesson, 'title' | 'participants'>,
  studentFallback?: string,
): string {
  if (lesson.title) return lesson.title;
  if (studentFallback) return studentFallback;
  return lesson.participants.map((p) => p.student?.first_name ?? '…').join(', ');
}

export const lessonKeys = {
  all: ['lessons'] as const,
  range: (from: string, to: string) => ['lessons', 'range', from, to] as const,
  detail: (id: string) => ['lessons', 'detail', id] as const,
  series: (id: string) => ['lessons', 'series', id] as const,
};

// ---------------------------------------------------------------------------
// Lesen
// ---------------------------------------------------------------------------
export async function listLessons(from: string, to: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select(LESSON_SELECT)
    .gte('start_at', from)
    .lt('start_at', to)
    .order('start_at')
    .limit(500);
  if (error) throw error;
  return (data as unknown as RawLesson[]).map(mapLesson);
}

export function useLessonsInRange(from: string, to: string) {
  return useQuery({ queryKey: lessonKeys.range(from, to), queryFn: () => listLessons(from, to) });
}

export function useLesson(id: string) {
  return useQuery({
    queryKey: lessonKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select(LESSON_SELECT).eq('id', id).single();
      if (error) throw error;
      return mapLesson(data as unknown as RawLesson);
    },
  });
}

export function useSeries(id: string | null) {
  return useQuery({
    queryKey: lessonKeys.series(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<LessonSeries | null> => {
      const { data, error } = await supabase
        .from('lesson_series')
        .select('id, frequency, start_date, end_date')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Konflikte
// ---------------------------------------------------------------------------
export type Conflict = {
  range_index: number;
  kind: 'overlap' | 'buffer';
  lesson_id: string;
  start_at: string;
  end_at: string;
  label: string | null;
};

export async function checkConflicts(
  teacherId: string,
  ranges: { start: string; end: string }[],
  ignoreLessonIds: string[] = [],
): Promise<Conflict[]> {
  if (ranges.length === 0) return [];
  const { data, error } = await supabase.rpc('check_conflicts', {
    p_teacher_id: teacherId,
    p_starts: ranges.map((r) => r.start),
    p_ends: ranges.map((r) => r.end),
    p_ignore_lesson_ids: ignoreLessonIds,
  });
  if (error) throw error;
  return data as Conflict[];
}

export type SeriesParams = {
  frequency: Frequency;
  startDate: string;
  endDate: string | null;
  localTime: string;
  durationMin: number;
  timezone: string;
};

export async function previewSeries(p: SeriesParams): Promise<{ start: string; end: string }[]> {
  const { data, error } = await supabase.rpc('preview_series', {
    p_start_date: p.startDate,
    p_end_date: p.endDate as string,
    p_frequency: p.frequency,
    p_local_start_time: p.localTime,
    p_duration_min: p.durationMin,
    p_timezone: p.timezone,
  });
  if (error) throw error;
  return data.map((r) => ({ start: r.start_at, end: r.end_at }));
}

// ---------------------------------------------------------------------------
// Schreiben
// ---------------------------------------------------------------------------
export type LessonContent = {
  title: string;
  format: LessonFormat;
  location: string;
  meetingUrl: string;
  level: Level | null;
  studentIds: string[];
  tagIds: string[];
};

function useInvalidateLessons() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: lessonKeys.all });
}

export function useCreateLesson() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async (
      input: LessonContent & { teacherId: string; start: string; end: string; timezone: string },
    ) => {
      const { data, error } = await supabase.rpc('create_lesson', {
        p_teacher_id: input.teacherId,
        p_start_at: input.start,
        p_end_at: input.end,
        p_timezone: input.timezone,
        p_title: input.title,
        p_format: input.format,
        p_location: input.location,
        p_meeting_url: input.meetingUrl,
        p_level: input.level as Level,
        p_student_ids: input.studentIds,
        p_tag_ids: input.tagIds,
      });
      if (error) throw error;
      return { lessonId: data, created: 1, skipped: 0 };
    },
    onSuccess: invalidate,
  });
}

export function useCreateSeries() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async (input: LessonContent & SeriesParams & { teacherId: string }) => {
      const { data, error } = await supabase.rpc('create_lesson_series', {
        p_teacher_id: input.teacherId,
        p_frequency: input.frequency,
        p_start_date: input.startDate,
        p_end_date: input.endDate as string,
        p_local_start_time: input.localTime,
        p_duration_min: input.durationMin,
        p_timezone: input.timezone,
        p_title: input.title,
        p_format: input.format,
        p_location: input.location,
        p_meeting_url: input.meetingUrl,
        p_level: input.level as Level,
        p_student_ids: input.studentIds,
        p_tag_ids: input.tagIds,
      });
      if (error) throw error;
      const row = data[0];
      return { lessonId: null, created: row?.created ?? 0, skipped: row?.skipped ?? 0 };
    },
    onSuccess: invalidate,
  });
}

export function useUpdateLesson(lessonId: string) {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async (input: LessonContent & { start: string; end: string }) => {
      const { error } = await supabase.rpc('update_lesson', {
        p_lesson_id: lessonId,
        p_start_at: input.start,
        p_end_at: input.end,
        p_title: input.title,
        p_format: input.format,
        p_location: input.location,
        p_meeting_url: input.meetingUrl,
        p_level: input.level as Level,
        p_student_ids: input.studentIds,
        p_tag_ids: input.tagIds,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateSeriesFrom(lessonId: string) {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async (input: LessonContent & Omit<SeriesParams, 'endDate' | 'timezone'>) => {
      const { data, error } = await supabase.rpc('update_series_from', {
        p_lesson_id: lessonId,
        p_start_date: input.startDate,
        p_local_start_time: input.localTime,
        p_duration_min: input.durationMin,
        p_frequency: input.frequency,
        p_title: input.title,
        p_format: input.format,
        p_location: input.location,
        p_meeting_url: input.meetingUrl,
        p_level: input.level as Level,
        p_student_ids: input.studentIds,
        p_tag_ids: input.tagIds,
      });
      if (error) throw error;
      const row = data[0];
      return { lessonId: null, created: row?.created ?? 0, skipped: row?.skipped ?? 0 };
    },
    onSuccess: invalidate,
  });
}

export function useRescheduleLesson(lessonId: string) {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async (input: { start: string; end: string }) => {
      const { error } = await supabase.rpc('reschedule_lesson', {
        p_lesson_id: lessonId,
        p_start_at: input.start,
        p_end_at: input.end,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useCancelLesson(lessonId: string) {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await supabase.rpc('cancel_lesson', { p_lesson_id: lessonId, p_reason: reason });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useRestoreLesson(lessonId: string) {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('restore_lesson', { p_lesson_id: lessonId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useMarkHeld(lessonId: string) {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async (attendance: Record<string, Attendance>) => {
      const { error } = await supabase.rpc('mark_lesson_held', {
        p_lesson_id: lessonId,
        p_attendance: attendance,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useEndSeries(lessonId: string) {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('end_series', { p_lesson_id: lessonId });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteLesson() {
  const invalidate = useInvalidateLessons();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
