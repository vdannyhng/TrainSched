import { DateTime } from 'luxon';

import type { Level } from '@/lib/colors';

export type ProgressPeriod = '3m' | '12m' | 'all';

export type StudentProgress = {
  held: number;
  present: number;
  absent: number;
  excused: number;
  unmarked: number;
  cancelled: number;
  cancelled_by_student: number;
  cancelled_late: number;
  open_past: number;
  minutes_present: number;
  first_held_at: string | null;
  last_held_at: string | null;
  attendance_rate: number | null;
  cancel_rate: number | null;
  start_level: Level | null;
  current_level: Level | null;
  levels: { level: Level | null; changed_at: string }[];
  topics: { id: string; label: string; color: string; lessons: number; last_at: string }[];
};

/** Beginn des Zeitraums (UTC-ISO) oder null für „gesamt“. */
export function periodStart(period: ProgressPeriod, now: DateTime = DateTime.now()): string | null {
  if (period === 'all') return null;
  return now
    .minus({ months: period === '3m' ? 3 : 12 })
    .toUTC()
    .toISO();
}

/** 0.6667 → „67 %“ (Locale-abhängiges Format), null → „–“. */
export function formatPercent(rate: number | null, locale: string): string {
  if (rate === null) return '–';
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(rate);
}

/** 150 → „2,5“ Stunden (eine Nachkommastelle, nur wenn nötig). */
export function formatHours(minutes: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(minutes / 60);
}

/**
 * Level-Stufen für die Zeitleiste: aufeinanderfolgende gleiche Level zusammenfassen
 * (z. B. wenn ein Level kurz geändert und zurückgesetzt wurde), leere Einträge weglassen.
 */
export function levelSteps(levels: StudentProgress['levels']): { level: Level; since: string }[] {
  const steps: { level: Level; since: string }[] = [];
  for (const entry of levels) {
    if (!entry.level) continue;
    if (steps[steps.length - 1]?.level === entry.level) continue;
    steps.push({ level: entry.level, since: entry.changed_at });
  }
  return steps;
}
