import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

import { lessonKeys } from '../lessons/api';

export type RequestKind = Enums<'request_kind'>;
export type RequestStatus = Enums<'request_status'>;

export type LessonRequest = Tables<'lesson_requests'> & {
  lesson: Pick<Tables<'lessons'>, 'id' | 'start_at' | 'end_at' | 'title' | 'status' | 'teacher_id'> | null;
  student: { first_name: string; last_name: string | null; timezone: string } | null;
};

const REQUEST_SELECT =
  '*, lesson:lessons(id, start_at, end_at, title, status, teacher_id), student:students(first_name, last_name, timezone)';

export const requestKeys = {
  all: ['requests'] as const,
  teacher: ['requests', 'teacher'] as const,
  pendingCount: ['requests', 'pending-count'] as const,
  detail: (id: string) => ['requests', 'detail', id] as const,
  lesson: (lessonId: string) => ['requests', 'lesson', lessonId] as const,
};

/** Lehrer: offene Anfragen (älteste zuerst) + zuletzt entschiedene. */
export function useTeacherRequests() {
  return useQuery({
    queryKey: requestKeys.teacher,
    queryFn: async () => {
      const [open, closed] = await Promise.all([
        supabase.from('lesson_requests').select(REQUEST_SELECT).eq('status', 'pending').order('created_at'),
        supabase
          .from('lesson_requests')
          .select(REQUEST_SELECT)
          .neq('status', 'pending')
          .order('decided_at', { ascending: false })
          .limit(30),
      ]);
      if (open.error) throw open.error;
      if (closed.error) throw closed.error;
      return {
        open: open.data as unknown as LessonRequest[],
        closed: closed.data as unknown as LessonRequest[],
      };
    },
  });
}

/** Badge am Tab „Anfragen“. */
export function usePendingRequestCount(enabled: boolean) {
  return useQuery({
    queryKey: requestKeys.pendingCount,
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('lesson_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: requestKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_requests')
        .select(REQUEST_SELECT)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as LessonRequest;
    },
  });
}

/** Anfragen zu einem Termin (neueste zuerst) – für Schüler- und Lehreransicht. */
export function useLessonRequests(lessonId: string) {
  return useQuery({
    queryKey: requestKeys.lesson(lessonId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_requests')
        .select(REQUEST_SELECT)
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as LessonRequest[];
    },
  });
}

/** Ab wann eine Absage „kurzfristig“ ist (Frist der Lehrkraft). */
export function useCancelDeadline(lessonId: string) {
  return useQuery({
    queryKey: ['requests', 'deadline', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('lesson_cancel_deadline', { p_lesson_id: lessonId });
      if (error) throw error;
      return data as string | null;
    },
  });
}

function useInvalidateRequests() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: requestKeys.all }),
      queryClient.invalidateQueries({ queryKey: lessonKeys.all }),
    ]);
}

export function useCreateRequest(lessonId: string) {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: async (input: { kind: RequestKind; message: string; starts: string[] }) => {
      const { data, error } = await supabase.rpc('create_lesson_request', {
        p_lesson_id: lessonId,
        p_kind: input.kind,
        p_message: input.message,
        p_proposed_starts: input.kind === 'reschedule' ? input.starts : [],
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useWithdrawRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('withdraw_lesson_request', { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDecideRequest(requestId: string) {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: async (input: { accept: boolean; chosenStart: string | null; response: string }) => {
      const { error } = await supabase.rpc('decide_lesson_request', {
        p_request_id: requestId,
        p_accept: input.accept,
        p_chosen_start: input.chosenStart as string,
        p_response: input.response,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
