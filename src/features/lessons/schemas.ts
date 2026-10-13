import { z } from 'zod';

import { LEVELS } from '@/lib/colors';
import { addMinutesIso, isValidLocalDate, isValidLocalTime, toUtcIso } from '@/lib/time';

export const DURATION_PRESETS = [45, 60, 90] as const;

export const lessonFormSchema = z
  .object({
    studentIds: z.array(z.string()).min(1, { message: 'participants_required' }),
    date: z.string().refine(isValidLocalDate, { message: 'invalid_date' }),
    time: z.string().trim().refine(isValidLocalTime, { message: 'invalid_time' }),
    durationMin: z
      .number()
      .int()
      .min(15, { message: 'invalid_duration' })
      .max(480, { message: 'invalid_duration' }),
    repeat: z.enum(['none', 'weekly', 'biweekly']),
    endDate: z.string(),
    format: z.enum(['online', 'in_person']),
    location: z.string().trim().max(300, { message: 'too_long' }),
    meetingUrl: z
      .string()
      .trim()
      .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), { message: 'invalid_url' }),
    title: z.string().trim().max(120, { message: 'too_long' }),
    level: z.enum(LEVELS).nullable(),
    tagIds: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    if (v.repeat === 'none' || v.endDate === '') return;
    if (!isValidLocalDate(v.endDate)) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'invalid_date' });
    } else if (v.endDate < v.date) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'end_before_start' });
    }
  });

export type LessonFormValues = z.input<typeof lessonFormSchema>;
export type LessonFormOutput = z.output<typeof lessonFormSchema>;

export function emptyLessonForm(date: string, studentIds: string[] = [], time = '18:00'): LessonFormValues {
  return {
    studentIds,
    date,
    time,
    durationMin: 60,
    repeat: 'none',
    endDate: '',
    format: 'in_person',
    location: '',
    meetingUrl: '',
    title: '',
    level: null,
    tagIds: [],
  };
}

/** Start/Ende in UTC für einen Einzeltermin. */
export function lessonRange(v: Pick<LessonFormOutput, 'date' | 'time' | 'durationMin'>, zone: string) {
  const start = toUtcIso(v.date, v.time, zone);
  return { start, end: addMinutesIso(start, v.durationMin) };
}

export function lessonContent(v: LessonFormOutput) {
  return {
    title: v.title,
    format: v.format,
    location: v.format === 'in_person' ? v.location : '',
    meetingUrl: v.format === 'online' ? v.meetingUrl : '',
    level: v.level,
    studentIds: v.studentIds,
    tagIds: v.tagIds,
  };
}
