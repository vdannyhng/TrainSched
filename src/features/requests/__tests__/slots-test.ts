import { buildSlotStarts } from '../slots';

const now = new Date('2026-11-02T08:00:00Z');

describe('buildSlotStarts', () => {
  it('rechnet lokale Zeit der Schülerin (Hanoi) in UTC um', () => {
    const result = buildSlotStarts([{ date: '2026-11-05', time: '19:30' }], 'Asia/Ho_Chi_Minh', now);
    expect(result).toEqual({ ok: true, starts: ['2026-11-05T12:30:00.000Z'] });
  });

  it('beachtet den Sommerzeitbeginn (Zürich, Ende März)', () => {
    const result = buildSlotStarts(
      [
        { date: '2027-03-27', time: '18:00' },
        { date: '2027-03-29', time: '18:00' },
      ],
      'Europe/Zurich',
      now,
    );
    expect(result).toEqual({ ok: true, starts: ['2027-03-27T17:00:00.000Z', '2027-03-29T16:00:00.000Z'] });
  });

  it('lehnt leere Liste, ungültige Uhrzeit, Vergangenheit und Doppelte ab', () => {
    expect(buildSlotStarts([], 'Europe/Zurich', now)).toEqual({ ok: false, error: 'slots_required' });
    expect(buildSlotStarts([{ date: '2026-11-05', time: '25:00' }], 'Europe/Zurich', now)).toEqual({
      ok: false,
      error: 'invalid_time',
    });
    expect(buildSlotStarts([{ date: '2026-11-01', time: '10:00' }], 'Europe/Zurich', now)).toEqual({
      ok: false,
      error: 'slot_in_past',
    });
    expect(
      buildSlotStarts(
        [
          { date: '2026-11-05', time: '10:00' },
          { date: '2026-11-05', time: '10:00' },
        ],
        'Europe/Zurich',
        now,
      ),
    ).toEqual({ ok: false, error: 'slot_duplicate' });
  });

  it('nimmt höchstens 3 Vorschläge', () => {
    const slots = [5, 6, 7, 8].map((d) => ({ date: `2026-11-0${d}`, time: '10:00' }));
    const result = buildSlotStarts(slots, 'Europe/Zurich', now);
    expect(result.ok && result.starts).toHaveLength(3);
  });
});
