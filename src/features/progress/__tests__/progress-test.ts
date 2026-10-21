import { DateTime } from 'luxon';

import { formatHours, formatPercent, levelSteps, periodStart } from '../progress';

describe('Lernfortschritt-Helfer', () => {
  it('Zeitraum-Beginn', () => {
    const now = DateTime.fromISO('2026-10-21T10:00:00Z');
    expect(periodStart('all', now)).toBeNull();
    expect(periodStart('3m', now)).toBe('2026-07-21T10:00:00.000Z');
    expect(periodStart('12m', now)).toBe('2025-10-21T10:00:00.000Z');
  });

  it('Prozent und Stunden lokalisiert', () => {
    expect(formatPercent(0.667, 'de')).toMatch(/^67\s?%$/);
    expect(formatPercent(null, 'de')).toBe('–');
    expect(formatHours(150, 'de')).toBe('2,5');
    expect(formatHours(120, 'vi')).toBe('2');
  });

  it('Level-Zeitleiste fasst Wiederholungen zusammen und lässt leere weg', () => {
    expect(
      levelSteps([
        { level: 'A1', changed_at: '2026-01-01' },
        { level: null, changed_at: '2026-02-01' },
        { level: 'A1', changed_at: '2026-03-01' },
        { level: 'A2', changed_at: '2026-05-01' },
        { level: 'B1', changed_at: '2026-09-01' },
      ]),
    ).toEqual([
      { level: 'A1', since: '2026-01-01' },
      { level: 'A2', since: '2026-05-01' },
      { level: 'B1', since: '2026-09-01' },
    ]);
  });
});
