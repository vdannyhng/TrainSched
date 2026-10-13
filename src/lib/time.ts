import { DateTime, Interval } from 'luxon';

/**
 * Zeit-Helfer. Grundsatz: gespeichert wird UTC (ISO), gerechnet/angezeigt in einer
 * IANA-Zone. Lokale Daten sind 'yyyy-MM-dd', lokale Uhrzeiten 'HH:mm'.
 */

export type LocalDate = string; // yyyy-MM-dd
export type LocalTime = string; // HH:mm

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidLocalTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function isValidLocalDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && DateTime.fromISO(value).isValid;
}

/** Lokales Datum + Uhrzeit in einer Zone → UTC-ISO. DST-sicher über Luxon. */
export function toUtcIso(date: LocalDate, time: LocalTime, zone: string): string {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone });
  if (!dt.isValid) throw new Error(`invalid local datetime ${date} ${time} ${zone}`);
  return dt.toUTC().toISO()!;
}

export function addMinutesIso(iso: string, minutes: number): string {
  return DateTime.fromISO(iso).plus({ minutes }).toUTC().toISO()!;
}

export function localDate(iso: string, zone: string): LocalDate {
  return DateTime.fromISO(iso, { zone }).toISODate()!;
}

export function localTime(iso: string, zone: string): LocalTime {
  return DateTime.fromISO(iso, { zone }).toFormat('HH:mm');
}

export function durationMinutes(startIso: string, endIso: string): number {
  return Math.round(DateTime.fromISO(endIso).diff(DateTime.fromISO(startIso), 'minutes').minutes);
}

export function todayIn(zone: string, now: DateTime = DateTime.now()): LocalDate {
  return now.setZone(zone).toISODate()!;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return DateTime.fromISO(date).plus({ days }).toISODate()!;
}

export function addMonths(date: LocalDate, months: number): LocalDate {
  return DateTime.fromISO(date).plus({ months }).toISODate()!;
}

/** Montag der Woche (ISO-Woche, Montag zuerst). */
export function startOfWeek(date: LocalDate): LocalDate {
  return DateTime.fromISO(date).startOf('week').toISODate()!;
}

/** UTC-Grenzen [from, to) für lokale Tage [start, start + days) in einer Zone. */
export function rangeForDays(start: LocalDate, days: number, zone: string): { from: string; to: string } {
  const from = DateTime.fromISO(start, { zone }).startOf('day');
  const to = from.plus({ days });
  return { from: from.toUTC().toISO()!, to: to.toUTC().toISO()! };
}

export function daysOf(start: LocalDate, count: number): LocalDate[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** 6×7-Raster (Montag zuerst) für die Monatsansicht. */
export function monthGrid(anyDayInMonth: LocalDate): { date: LocalDate; inMonth: boolean }[][] {
  const first = DateTime.fromISO(anyDayInMonth).startOf('month');
  const gridStart = first.startOf('week');
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = gridStart.plus({ days: w * 7 + d });
      return { date: day.toISODate()!, inMonth: day.month === first.month };
    }),
  );
}

// ---------------------------------------------------------------------------
// Formatierung (locale: 'de' | 'vi')
// ---------------------------------------------------------------------------
export function formatTime(iso: string, zone: string, locale: string): string {
  return DateTime.fromISO(iso, { zone }).setLocale(locale).toLocaleString(DateTime.TIME_24_SIMPLE);
}

export function formatTimeRange(startIso: string, endIso: string, zone: string, locale: string): string {
  return `${formatTime(startIso, zone, locale)}–${formatTime(endIso, zone, locale)}`;
}

// Hinweis: Namen von Wochentagen/Monaten NIE über Luxon-`toFormat('ccc'|'LLL')` bilden –
// das nutzt Intl.formatToParts, das auf iOS (Hermes) null liefert. `toLocaleString` nutzt
// Intl.DateTimeFormat#format und funktioniert überall.

/** z. B. „Di., 17. März“ */
export function formatDayShort(date: LocalDate, locale: string): string {
  return DateTime.fromISO(date)
    .setLocale(locale)
    .toLocaleString({ weekday: 'short', day: 'numeric', month: 'short' });
}

/** z. B. „12. Okt.“ */
export function formatDayMonth(date: LocalDate, locale: string): string {
  return DateTime.fromISO(date).setLocale(locale).toLocaleString({ day: 'numeric', month: 'short' });
}

/** Kurzer Wochentag, z. B. „Mo.“ / „Th 2“ */
export function formatWeekdayShort(date: LocalDate, locale: string): string {
  return DateTime.fromISO(date).setLocale(locale).toLocaleString({ weekday: 'short' });
}

/** z. B. „Dienstag, 17. März 2026“ */
export function formatDayLong(date: LocalDate, locale: string): string {
  return DateTime.fromISO(date).setLocale(locale).toLocaleString({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatMonth(date: LocalDate, locale: string): string {
  return DateTime.fromISO(date).setLocale(locale).toLocaleString({ month: 'long', year: 'numeric' });
}

export function weekdayShortNames(locale: string): string[] {
  const monday = DateTime.fromISO('2026-01-05');
  return Array.from({ length: 7 }, (_, i) =>
    formatWeekdayShort(monday.plus({ days: i }).toISODate()!, locale),
  );
}

/** Stadtname aus IANA-Zone („Asia/Ho_Chi_Minh“ → „Ho Chi Minh“). */
export function zoneCity(zone: string): string {
  return (zone.split('/').pop() ?? zone).replace(/_/g, ' ');
}

/** Zweite Zeitangabe, falls eine andere Zone eine andere Uhrzeit ergibt (sonst null). */
export function otherZoneTime(
  startIso: string,
  viewerZone: string,
  otherZone: string,
  locale: string,
): string | null {
  const a = DateTime.fromISO(startIso, { zone: viewerZone });
  const b = DateTime.fromISO(startIso, { zone: otherZone });
  if (a.offset === b.offset) return null;
  // Kalenderdaten vergleichen, nicht Mitternachts-Zeitpunkte verschiedener Zonen.
  const dayShift = DateTime.fromISO(b.toISODate()!).diff(DateTime.fromISO(a.toISODate()!), 'days').days;
  const suffix = dayShift > 0 ? ' (+1)' : dayShift < 0 ? ' (−1)' : '';
  return `${formatTime(startIso, otherZone, locale)}${suffix} ${zoneCity(otherZone)}`;
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return Interval.fromISO(`${aStart}/${aEnd}`).overlaps(Interval.fromISO(`${bStart}/${bEnd}`));
}
