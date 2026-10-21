import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { periodStart, type ProgressPeriod, type StudentProgress } from './progress';

export function useStudentProgress(studentId: string | undefined, period: ProgressPeriod) {
  return useQuery({
    queryKey: ['progress', studentId, period],
    enabled: !!studentId,
    queryFn: async () => {
      const from = periodStart(period);
      const { data, error } = await supabase.rpc('student_progress', {
        p_student_id: studentId!,
        ...(from ? { p_from: from } : {}),
      });
      if (error) throw error;
      return data as unknown as StudentProgress;
    },
  });
}
