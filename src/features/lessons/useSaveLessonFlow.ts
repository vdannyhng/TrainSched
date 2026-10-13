import { router } from 'expo-router';
import { useState } from 'react';

import { useTeacherSettings } from '@/features/settings/api';
import { supabase } from '@/lib/supabase';

import {
  checkConflicts,
  previewSeries,
  useCreateLesson,
  useCreateSeries,
  useUpdateLesson,
  useUpdateSeriesFrom,
  type Conflict,
  type Lesson,
} from './api';
import type { LessonFormMode } from './components/LessonForm';
import { lessonContent, lessonRange, type LessonFormOutput } from './schemas';

type Pending = { values: LessonFormOutput; conflicts: Conflict[]; isSeries: boolean; ownerId: string };
export type SaveResult = { created: number; skipped: number };

/**
 * Ablauf beim Speichern: Vorkommen bestimmen → Konflikte prüfen → ggf. Rückfrage → speichern.
 * Überschneidungen bei Einzelterminen sind nicht speicherbar (DB-Constraint), Puffer nur Warnung.
 */
export function useSaveLessonFlow(opts: {
  mode: LessonFormMode;
  teacherId: string | undefined;
  zone: string;
  lesson?: Lesson;
  onSaved?: (result: SaveResult) => void;
}) {
  const { mode, teacherId, zone, lesson } = opts;
  const [pending, setPending] = useState<Pending | null>(null);
  // Pufferzeit des Lehrers, dem der Termin gehört (bei Admin-Planung evtl. ein anderer)
  const settings = useTeacherSettings(pending?.ownerId ?? teacherId);
  const createLesson = useCreateLesson();
  const createSeries = useCreateSeries();
  const updateLesson = useUpdateLesson(lesson?.id ?? '');
  const updateFollowing = useUpdateSeriesFrom(lesson?.id ?? '');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<unknown>(null);

  const isSeriesValues = (v: LessonFormOutput) =>
    mode === 'following' || (mode === 'create' && v.repeat !== 'none');

  async function ranges(v: LessonFormOutput) {
    if (!isSeriesValues(v)) return [lessonRange(v, zone)];
    return previewSeries({
      frequency: v.repeat === 'biweekly' ? 'biweekly' : 'weekly',
      startDate: v.date,
      endDate: mode === 'create' && v.endDate ? v.endDate : null,
      localTime: v.time,
      durationMin: v.durationMin,
      timezone: zone,
    });
  }

  /** Beim Anlegen gehört der Termin dem Lehrer der Teilnehmenden (Admin kann für andere planen). */
  async function effectiveTeacherId(v: LessonFormOutput): Promise<string> {
    if (mode !== 'create') return teacherId!;
    const { data, error } = await supabase
      .from('students')
      .select('teacher_id')
      .eq('id', v.studentIds[0]!)
      .single();
    if (error) throw error;
    return data.teacher_id;
  }

  async function ignoredLessonIds(): Promise<string[]> {
    if (!lesson) return [];
    if (mode !== 'following' || !lesson.series_id) return [lesson.id];
    // Bei „diesen und folgende“ werden die künftigen Vorkommen ersetzt → nicht als Konflikt zählen.
    const { data, error } = await supabase
      .from('lessons')
      .select('id')
      .eq('series_id', lesson.series_id)
      .gte('original_start_at', lesson.original_start_at ?? lesson.start_at);
    if (error) throw error;
    return data.map((r) => r.id);
  }

  async function persist(v: LessonFormOutput): Promise<void> {
    const content = lessonContent(v);
    const owner = await effectiveTeacherId(v);
    const frequency = v.repeat === 'biweekly' ? 'biweekly' : 'weekly';
    let result: SaveResult = { created: 1, skipped: 0 };
    if (mode === 'create' && v.repeat === 'none') {
      const r = await createLesson.mutateAsync({
        ...content,
        ...lessonRange(v, zone),
        teacherId: owner,
        timezone: zone,
      });
      setPending(null);
      opts.onSaved?.(r);
      if (r.lessonId) router.replace(`/lesson/${r.lessonId}`);
      return;
    }
    if (mode === 'create') {
      result = await createSeries.mutateAsync({
        ...content,
        teacherId: owner,
        frequency,
        startDate: v.date,
        endDate: v.endDate || null,
        localTime: v.time,
        durationMin: v.durationMin,
        timezone: zone,
      });
    } else if (mode === 'this') {
      await updateLesson.mutateAsync({ ...content, ...lessonRange(v, zone) });
    } else {
      result = await updateFollowing.mutateAsync({
        ...content,
        frequency,
        startDate: v.date,
        localTime: v.time,
        durationMin: v.durationMin,
      });
    }
    setPending(null);
    opts.onSaved?.(result);
    if (mode === 'this') router.back();
  }

  async function submit(v: LessonFormOutput) {
    setCheckError(null);
    setChecking(true);
    try {
      const ownerId = await effectiveTeacherId(v);
      const conflicts = await checkConflicts(ownerId, await ranges(v), await ignoredLessonIds());
      if (conflicts.length) {
        setPending({ values: v, conflicts, isSeries: isSeriesValues(v), ownerId });
        return;
      }
      await persist(v);
    } catch (e) {
      setCheckError(e);
    } finally {
      setChecking(false);
    }
  }

  async function confirm() {
    if (!pending) return;
    setChecking(true);
    try {
      await persist(pending.values);
    } catch (e) {
      setCheckError(e);
    } finally {
      setChecking(false);
    }
  }

  return {
    submit,
    confirm,
    dismiss: () => setPending(null),
    pending,
    busy: checking,
    error: checkError,
    bufferMinutes: settings.data?.buffer_minutes ?? 15,
  };
}
