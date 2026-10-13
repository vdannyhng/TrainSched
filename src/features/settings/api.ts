import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export const settingsKeys = { teacher: (id: string) => ['teacher-settings', id] as const };

export function useTeacherSettings(teacherId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.teacher(teacherId ?? ''),
    enabled: !!teacherId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_settings')
        .select('buffer_minutes, default_duration_min, cancel_deadline_hours, default_timezone')
        .eq('teacher_id', teacherId!)
        .maybeSingle();
      if (error) throw error;
      return (
        data ?? {
          buffer_minutes: 15,
          default_duration_min: 60,
          cancel_deadline_hours: 24,
          default_timezone: 'Europe/Zurich',
        }
      );
    },
  });
}

export function useUpdateBuffer(teacherId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (minutes: number) => {
      const { error } = await supabase
        .from('teacher_settings')
        .update({ buffer_minutes: minutes })
        .eq('teacher_id', teacherId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.teacher(teacherId ?? '') }),
  });
}

/** Konto pausieren / reaktivieren (Lehrer: eigene Schüler; Admin: alle außer sich selbst). */
export function useSetAccessPaused() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, paused }: { profileId: string; paused: boolean }) => {
      const { error } = await supabase.rpc('set_access_paused', {
        p_profile_id: profileId,
        p_paused: paused,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access'] }),
  });
}

export function useAccessStatus(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['access', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('access_paused_at')
        .eq('id', profileId!)
        .maybeSingle();
      if (error) throw error;
      return data?.access_paused_at ?? null;
    },
  });
}

export function useTeachers(enabled: boolean) {
  return useQuery({
    queryKey: ['access', 'teachers'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, role, access_paused_at')
        .in('role', ['teacher', 'admin'])
        .order('display_name');
      if (error) throw error;
      return data;
    },
  });
}

/** Anzeigename eines Profils (z. B. Lehrer, dem ein Termin gehört). */
export function useProfileName(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['profile-name', profileId],
    enabled: !!profileId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', profileId!)
        .maybeSingle();
      if (error) throw error;
      return data?.display_name || data?.email || null;
    },
  });
}
