/// <reference types="node" />
import { DateTime } from 'luxon';

import { readFileSync } from 'fs';
import { join } from 'path';

import {
  addDays,
  formatDayShort,
  weekdayShortNames,
  durationMinutes,
  formatTime,
  isValidLocalDate,
  isValidLocalTime,
  localDate,
  localTime,
  monthGrid,
  otherZoneTime,
  rangeForDays,
  startOfWeek,
  todayIn,
  toUtcIso,
} from '../time';

describe('toUtcIso (DST-sicher)', () => {
  it.each([
    ['2026-03-28', '18:00', '2026-03-28T17:00:00.000Z'], // Winterzeit (UTC+1)
    ['2026-03-29', '18:00', '2026-03-29T16:00:00.000Z'], // Tag der Umstellung → Sommerzeit (UTC+2)
    ['2026-10-24', '10:00', '2026-10-24T08:00:00.000Z'],
    ['2026-10-25', '10:00', '2026-10-25T09:00:00.000Z'], // zurück auf Winterzeit
  ])('%s %s Zürich → %s', (date, time, expected) => {
    expect(toUtcIso(date, time, 'Europe/Zurich')).toBe(expected);
  });

  it('Hanoi kennt keine Sommerzeit', () => {
    expect(toUtcIso('2026-07-01', '20:00', 'Asia/Ho_Chi_Minh')).toBe('2026-07-01T13:00:00.000Z');
  });

  it('Rückrechnung ergibt wieder die lokale Uhrzeit', () => {
    const iso = toUtcIso('2026-03-29', '18:00', 'Europe/Zurich');
    expect(localDate(iso, 'Europe/Zurich')).toBe('2026-03-29');
    expect(localTime(iso, 'Europe/Zurich')).toBe('18:00');
  });
});

describe('Anzeige in anderer Zeitzone', () => {
  const lesson = toUtcIso('2026-07-07', '18:00', 'Europe/Zurich');

  it('Schülerin in Hanoi sieht 23:00', () => {
    expect(formatTime(lesson, 'Asia/Ho_Chi_Minh', 'de')).toBe('23:00');
  });

  it('zweite Zeitangabe nur bei abweichender Uhrzeit', () => {
    expect(otherZoneTime(lesson, 'Europe/Zurich', 'Asia/Ho_Chi_Minh', 'de')).toBe('23:00 Ho Chi Minh');
    expect(otherZoneTime(lesson, 'Europe/Zurich', 'Europe/Berlin', 'de')).toBeNull();
  });

  it('markiert Tageswechsel', () => {
    const late = toUtcIso('2026-12-01', '19:30', 'Europe/Zurich'); // Winter: Hanoi +6 h → 01:30 am Folgetag
    expect(otherZoneTime(late, 'Europe/Zurich', 'Asia/Ho_Chi_Minh', 'de')).toBe('01:30 (+1) Ho Chi Minh');
    const morning = toUtcIso('2026-12-02', '05:00', 'Asia/Ho_Chi_Minh'); // 23:00 Vortag in Zürich
    expect(otherZoneTime(morning, 'Asia/Ho_Chi_Minh', 'Europe/Zurich', 'de')).toBe('23:00 (−1) Zurich');
  });
});

describe('Bereiche & Raster', () => {
  it('ein lokaler Tag am Umstellungstag hat 23 Stunden', () => {
    const { from, to } = rangeForDays('2026-03-29', 1, 'Europe/Zurich');
    expect(durationMinutes(from, to)).toBe(23 * 60);
  });

  it('Woche beginnt am Montag', () => {
    expect(startOfWeek('2026-10-15')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12');
  });

  it('Monatsraster: 6 Wochen, Montag zuerst, Randtage markiert', () => {
    const grid = monthGrid('2026-10-13');
    expect(grid).toHaveLength(6);
    expect(grid[0]![0]).toEqual({ date: '2026-09-28', inMonth: false });
    expect(grid[0]![3]).toEqual({ date: '2026-10-01', inMonth: true });
  });

  it('heute in einer Zone (Mitternachtsgrenze)', () => {
    const now = DateTime.fromISO('2026-10-12T23:30:00Z');
    expect(todayIn('Europe/Zurich', now)).toBe('2026-10-13');
    expect(todayIn('America/New_York', now)).toBe('2026-10-12');
  });

  it('Validierung', () => {
    expect(isValidLocalTime('18:00')).toBe(true);
    expect(isValidLocalTime('24:00')).toBe(false);
    expect(isValidLocalTime('8:00')).toBe(false);
    expect(isValidLocalDate('2026-02-30')).toBe(false);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('Formatierung ohne formatToParts (iOS/Hermes)', () => {
  it('Kurzformate enthalten echte Namen', () => {
    expect(formatDayShort('2026-10-12', 'de')).toMatch(/Mo.*12.*Okt/);
    expect(weekdayShortNames('de')).toHaveLength(7);
    expect(weekdayShortNames('de').join(' ')).not.toContain('null');
  });

  it('nutzt keine Namens-Tokens in toFormat (liefern auf Hermes null)', () => {
    const source = readFileSync(join(__dirname, '..', 'time.ts'), 'utf8');
    expect(source).not.toMatch(/\.toFormat\(\s*['"`][^'"`]*(ccc|EEE|LLL|MMM)/);
  });
});
