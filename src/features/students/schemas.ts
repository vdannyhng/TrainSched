import { z } from 'zod';

import { LEVELS } from '@/lib/colors';
import { isValidTimezone } from '@/lib/timezones';
import type { Enums, Tables, TablesInsert } from '@/types/database';

export const STUDENT_STATUSES = [
  'active',
  'inactive',
  'archived',
] as const satisfies readonly Enums<'student_status'>[];

const optionalText = (max: number) => z.string().trim().max(max, { message: 'too_long' });
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === '' || z.email().safeParse(v).success, { message: 'invalid_email' });
const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === '' || /^[+0-9 ()/.-]{5,30}$/.test(v), { message: 'invalid_phone' });

export const studentFormSchema = z
  .object({
    firstName: z.string().trim().min(1, { message: 'required' }).max(100, { message: 'too_long' }),
    lastName: optionalText(100),
    email: optionalEmail,
    phone: optionalPhone,
    timezone: z.string().trim().refine(isValidTimezone, { message: 'invalid_timezone' }),
    locale: z.enum(['de', 'vi']),
    startLevel: z.enum(LEVELS).nullable(),
    currentLevel: z.enum(LEVELS).nullable(),
    goal: optionalText(2000),
    status: z.enum(STUDENT_STATUSES),
    isMinor: z.boolean(),
    guardianName: optionalText(200),
    guardianEmail: optionalEmail,
    guardianPhone: optionalPhone,
    guardianConsent: z.boolean(),
    tagIds: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    if (!v.isMinor) return;
    if (!v.guardianName) ctx.addIssue({ code: 'custom', path: ['guardianName'], message: 'required' });
    if (!v.guardianEmail && !v.guardianPhone) {
      ctx.addIssue({ code: 'custom', path: ['guardianEmail'], message: 'guardian_contact_required' });
    }
  });

export type StudentFormValues = z.input<typeof studentFormSchema>;
export type StudentFormOutput = z.output<typeof studentFormSchema>;

export const emptyStudentForm: StudentFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  timezone: 'Europe/Zurich',
  locale: 'de',
  startLevel: null,
  currentLevel: null,
  goal: '',
  status: 'active',
  isMinor: false,
  guardianName: '',
  guardianEmail: '',
  guardianPhone: '',
  guardianConsent: false,
  tagIds: [],
};

type StudentRow = Tables<'students'>;
type StudentWritable = Omit<
  TablesInsert<'students'>,
  | 'id'
  | 'teacher_id'
  | 'profile_id'
  | 'created_at'
  | 'updated_at'
  | 'hourly_rate'
  | 'currency'
  | 'search_text'
>;

const orNull = (v: string) => (v === '' ? null : v);

/**
 * Formularwerte → DB-Spalten. Erziehungsberechtigte werden bei Volljährigen geleert (Datensparsamkeit).
 * Der Einwilligungszeitpunkt bleibt erhalten, solange der Haken gesetzt bleibt.
 */
export function toStudentRow(
  v: StudentFormOutput,
  existingConsentAt: string | null = null,
  now: Date = new Date(),
): StudentWritable {
  const minor = v.isMinor;
  return {
    first_name: v.firstName,
    last_name: orNull(v.lastName),
    email: orNull(v.email),
    phone: orNull(v.phone),
    timezone: v.timezone,
    locale: v.locale,
    start_level: v.startLevel,
    current_level: v.currentLevel,
    goal: orNull(v.goal),
    status: v.status,
    is_minor: minor,
    guardian_name: minor ? orNull(v.guardianName) : null,
    guardian_email: minor ? orNull(v.guardianEmail) : null,
    guardian_phone: minor ? orNull(v.guardianPhone) : null,
    guardian_consent_at: minor && v.guardianConsent ? (existingConsentAt ?? now.toISOString()) : null,
  };
}

export function toStudentForm(row: StudentRow, tagIds: string[]): StudentFormValues {
  return {
    firstName: row.first_name,
    lastName: row.last_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    timezone: row.timezone,
    locale: row.locale,
    startLevel: row.start_level,
    currentLevel: row.current_level,
    goal: row.goal ?? '',
    status: row.status,
    isMinor: row.is_minor,
    guardianName: row.guardian_name ?? '',
    guardianEmail: row.guardian_email ?? '',
    guardianPhone: row.guardian_phone ?? '',
    guardianConsent: row.guardian_consent_at !== null,
    tagIds,
  };
}
