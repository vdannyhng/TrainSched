import { isValidLocalDate, isValidLocalTime, toUtcIso } from '@/lib/time';

export const MAX_SLOTS = 3;

export type SlotInput = { date: string; time: string };

export type SlotResult =
  | { ok: true; starts: string[] }
  | { ok: false; error: 'invalid_time' | 'slot_in_past' | 'slot_duplicate' | 'slots_required' };

/**
 * Wandelt die Wunschtermine (lokales Datum + Uhrzeit in der Zone des Schülers) in UTC-Zeitpunkte.
 * Gleiche Regeln wie `create_lesson_request` auf dem Server – hier nur für sofortiges Feedback.
 */
export function buildSlotStarts(slots: SlotInput[], zone: string, now: Date = new Date()): SlotResult {
  if (slots.length === 0) return { ok: false, error: 'slots_required' };
  const starts: string[] = [];
  for (const s of slots.slice(0, MAX_SLOTS)) {
    if (!isValidLocalDate(s.date) || !isValidLocalTime(s.time)) return { ok: false, error: 'invalid_time' };
    const iso = toUtcIso(s.date, s.time, zone);
    if (new Date(iso).getTime() <= now.getTime()) return { ok: false, error: 'slot_in_past' };
    if (starts.some((x) => new Date(x).getTime() === new Date(iso).getTime())) {
      return { ok: false, error: 'slot_duplicate' };
    }
    starts.push(iso);
  }
  return { ok: true, starts };
}
