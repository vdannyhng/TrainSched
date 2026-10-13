/** Reine Rechenhelfer der Zeitleiste (Minuten seit Mitternacht), separat testbar. */

export const SNAP_MIN = 15;
export const DEFAULT_DURATION_MIN = 60;
export const MIN_DRAG_DURATION_MIN = 30;
export const DAY_END_MIN = 24 * 60;

const snap = (m: number, step = SNAP_MIN) => Math.round(m / step) * step;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Minute (seit Mitternacht) an der Position y der Zeitleiste. */
export function minutesAtY(y: number, firstHour: number, hourHeight: number): number {
  return firstHour * 60 + (y / hourHeight) * 60;
}

/** Handy: neuer Block (60 Min.) unter dem Finger zentriert, im 15-Min.-Raster. */
export function centeredStart(minutes: number, firstHour: number, duration = DEFAULT_DURATION_MIN): number {
  return clamp(snap(minutes - duration / 2), firstHour * 60, DAY_END_MIN - duration);
}

/** PC-Klick: Slot beginnt an der angeklickten halben Stunde. */
export function clickStart(minutes: number, firstHour: number, duration = DEFAULT_DURATION_MIN): number {
  return clamp(Math.floor(minutes / 30) * 30, firstHour * 60, DAY_END_MIN - duration);
}

/**
 * PC-Ziehen: Zeitraum zwischen Startpunkt und aktueller Mausposition (beide Richtungen),
 * im 15-Min.-Raster, mindestens 30 Minuten.
 */
export function dragRange(
  anchor: number,
  current: number,
  firstHour: number,
): { start: number; end: number } {
  const a = clamp(
    Math.floor(anchor / SNAP_MIN) * SNAP_MIN,
    firstHour * 60,
    DAY_END_MIN - MIN_DRAG_DURATION_MIN,
  );
  const c = clamp(snap(current), firstHour * 60, DAY_END_MIN);
  let start = Math.min(a, c);
  let end = Math.max(a + SNAP_MIN, c);
  if (end - start < MIN_DRAG_DURATION_MIN) {
    if (c < a) start = Math.max(firstHour * 60, end - MIN_DRAG_DURATION_MIN);
    else end = Math.min(DAY_END_MIN, start + MIN_DRAG_DURATION_MIN);
  }
  return { start, end };
}

export function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
