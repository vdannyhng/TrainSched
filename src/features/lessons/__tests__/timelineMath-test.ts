import { centeredStart, clickStart, dragRange, minutesAtY, toTime } from '../components/timelineMath';

const FIRST = 6;

describe('Zeitleisten-Rechnung', () => {
  it('Minute aus Position: 56 px/Std. ab 06:00', () => {
    expect(minutesAtY(13 * 56, FIRST, 56)).toBe(19 * 60);
  });

  it('Handy: Block unter dem Finger zentriert, 15-Min.-Raster', () => {
    expect(toTime(centeredStart(19 * 60, FIRST))).toBe('18:30');
    expect(toTime(centeredStart(19 * 60 + 8, FIRST))).toBe('18:45');
    expect(toTime(centeredStart(6 * 60 + 10, FIRST))).toBe('06:00'); // nicht vor Tagesbeginn
    expect(toTime(centeredStart(23 * 60 + 50, FIRST))).toBe('23:00'); // endet spätestens 24:00
  });

  it('PC-Klick: Beginn an der angeklickten halben Stunde', () => {
    expect(toTime(clickStart(10 * 60 + 20, FIRST))).toBe('10:00');
    expect(toTime(clickStart(10 * 60 + 40, FIRST))).toBe('10:30');
  });

  it.each([
    ['nach unten ziehen', 10 * 60 + 5, 11 * 60 + 35, '10:00–11:30'],
    ['nach oben ziehen', 14 * 60 + 10, 12 * 60 + 50, '12:45–14:15'],
    ['kaum bewegt → mindestens 30 Min.', 9 * 60, 9 * 60 + 4, '09:00–09:30'],
    ['bis Mitternacht', 23 * 60, 24 * 60 + 30, '23:00–24:00'],
  ])('PC-Ziehen: %s', (_label, anchor, current, expected) => {
    const r = dragRange(anchor, current, FIRST);
    expect(`${toTime(r.start)}–${toTime(r.end)}`).toBe(expected);
  });
});
