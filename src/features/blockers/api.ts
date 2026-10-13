import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';
import { isValidLocalDate, isValidLocalTime } from '@/lib/time';
import type { Tables, TablesInsert } from '@/types/database';

export type Blocker = Tables<'blockers'>;
export type BlockerOccurrence = { blocker_id: string; title: string; start_at: string; end_at: string };

export const blockerKeys = {
  all: ['blockers'] as const,
  range: (teacherId: string, from: string, to: string) => ['blockers', 'range', teacherId, from, to] as const,
  detail: (id: string) => ['blockers', 'detail', id] as const,
};

export function useBlockerOccurrences(teacherId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: blockerKeys.range(teacherId ?? '', from, to),
    enabled: !!teacherId,
    queryFn: async (): Promise<BlockerOccurrence[]> => {
      const { data, error } = await supabase.rpc('blocker_occurrences', {
        p_teacher_id: teacherId!,
        p_from: from,
        p_to: to,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useBlocker(id: string | undefined) {
  return useQuery({
    queryKey: blockerKeys.detail(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('blockers').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Formular
// ---------------------------------------------------------------------------
export const blockerFormSchema = z
  .object({
    title: z.string().trim().min(1, { message: 'required' }).max(80, { message: 'too_long' }),
    date: z.string().refine(isValidLocalDate, { message: 'invalid_date' }),
    startTime: z.string().trim().refine(isValidLocalTime, { message: 'invalid_time' }),
    endTime: z.string().trim().refine(isValidLocalTime, { message: 'invalid_time' }),
    repeat: z.enum(['none', 'weekly']),
    weekdays: z.array(z.number().int().min(1).max(7)),
    endDate: z.string(),
  })
  .superRefine((v, ctx) => {
    if (isValidLocalTime(v.startTime) && isValidLocalTime(v.endTime) && v.endTime <= v.startTime) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'end_before_start_time' });
    }
    if (v.repeat === 'weekly' && v.weekdays.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['weekdays'], message: 'weekdays_required' });
    }
    if (v.repeat === 'weekly' && v.endDate !== '' && v.endDate < v.date) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'end_before_start' });
    }
  });

export type BlockerFormValues = z.input<typeof blockerFormSchema>;
export type BlockerFormOutput = z.output<typeof blockerFormSchema>;

export function isoWeekday(date: string): number {
  return DateTime.fromISO(date).weekday;
}

export function emptyBlockerForm(date: string, startTime = '08:00', durationMin = 60): BlockerFormValues {
  const [h, m] = startTime.split(':').map(Number) as [number, number];
  const endMinutes = Math.min(23 * 60 + 59, h * 60 + m + Math.max(15, durationMin));
  const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  return {
    title: '',
    date,
    startTime,
    endTime: end > startTime ? end : '23:59',
    repeat: 'none',
    weekdays: [isoWeekday(date)],
    endDate: '',
  };
}

export function toBlockerRow(
  v: BlockerFormOutput,
  timezone: string,
): Omit<TablesInsert<'blockers'>, 'teacher_id'> {
  const weekly = v.repeat === 'weekly';
  return {
    title: v.title,
    start_date: v.date,
    end_date: weekly ? v.endDate || null : v.date,
    weekdays: weekly ? [...v.weekdays].sort() : [isoWeekday(v.date)],
    local_start: v.startTime,
    local_end: v.endTime,
    timezone,
  };
}

export function toBlockerForm(b: Blocker): BlockerFormValues {
  const single = b.end_date === b.start_date;
  return {
    title: b.title,
    date: b.start_date,
    startTime: b.local_start.slice(0, 5),
    endTime: b.local_end.slice(0, 5),
    repeat: single ? 'none' : 'weekly',
    weekdays: b.weekdays,
    endDate: single ? '' : (b.end_date ?? ''),
  };
}

export function useSaveBlocker(teacherId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      timezone,
    }: {
      id?: string;
      values: BlockerFormOutput;
      timezone: string;
    }) => {
      const row = toBlockerRow(values, timezone);
      const { error } = id
        ? await supabase.from('blockers').update(row).eq('id', id)
        : await supabase.from('blockers').insert({ ...row, teacher_id: teacherId! });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blockerKeys.all }),
  });
}

export function useDeleteBlocker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blockers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blockerKeys.all }),
  });
}
