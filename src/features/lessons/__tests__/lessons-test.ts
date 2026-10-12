import { buildIcs } from '@/lib/ics';

import { lessonLabel } from '../api';
import { emptyLessonForm, lessonContent, lessonFormSchema, lessonRange } from '../schemas';

const valid = { ...emptyLessonForm('2026-03-29', ['s1']), time: '18:00' };
const issues = (overrides: object) => {
  const r = lessonFormSchema.safeParse({ ...valid, ...overrides });
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}:${i.message}`);
};

describe('lessonFormSchema', () => {
  it('akzeptiert ein gültiges Formular', () => {
    expect(issues({})).toEqual([]);
  });

  it.each([
    [{ studentIds: [] }, 'studentIds:participants_required'],
    [{ time: '25:00' }, 'time:invalid_time'],
    [{ durationMin: 5 }, 'durationMin:invalid_duration'],
    [{ format: 'online', meetingUrl: 'zoom.us/abc' }, 'meetingUrl:invalid_url'],
    [{ repeat: 'weekly', endDate: '2026-03-01' }, 'endDate:end_before_start'],
  ])('%j → %s', (overrides, expected) => {
    expect(issues(overrides)).toEqual([expected]);
  });

  it('Enddatum wird bei Einzelterminen ignoriert', () => {
    expect(issues({ repeat: 'none', endDate: '2020-01-01' })).toEqual([]);
  });
});

describe('lessonRange', () => {
  it('rechnet am Tag der Zeitumstellung korrekt in UTC um', () => {
    expect(lessonRange({ date: '2026-03-29', time: '18:00', durationMin: 90 }, 'Europe/Zurich')).toEqual({
      start: '2026-03-29T16:00:00.000Z',
      end: '2026-03-29T17:30:00.000Z',
    });
  });
});

describe('lessonContent', () => {
  it('speichert nur das zum Format passende Feld (Ort oder Link)', () => {
    const parsed = lessonFormSchema.parse({
      ...valid,
      format: 'online',
      location: 'Alter Ort',
      meetingUrl: 'https://meet.example/x',
    });
    expect(lessonContent(parsed)).toMatchObject({ location: '', meetingUrl: 'https://meet.example/x' });
  });
});

describe('lessonLabel', () => {
  const p = (first_name: string) => ({
    student_id: first_name,
    attendance: 'pending' as const,
    student: { first_name, last_name: null, timezone: 'Europe/Zurich' },
  });

  it('Titel hat Vorrang, sonst Vornamen', () => {
    expect(lessonLabel({ title: 'B1-Gruppe', participants: [p('Hương')] })).toBe('B1-Gruppe');
    expect(lessonLabel({ title: null, participants: [p('Hương'), p('Jonas')] })).toBe('Hương, Jonas');
  });
});

describe('buildIcs', () => {
  const ics = buildIcs(
    [
      {
        uid: 'abc',
        start: '2026-03-29T16:00:00.000Z',
        end: '2026-03-29T17:00:00.000Z',
        summary: 'TrainSched: Hương, Jonas; Grammatik',
        location: 'Bahnhofstrasse 1, Zürich',
        cancelled: true,
      },
    ],
    new Date('2026-03-01T00:00:00Z'),
  );

  it('enthält UTC-Zeiten, Status und CRLF-Zeilenenden', () => {
    expect(ics).toContain('DTSTART:20260329T160000Z\r\n');
    expect(ics).toContain('DTEND:20260329T170000Z\r\n');
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  });

  it('maskiert Sonderzeichen', () => {
    expect(ics).toContain('SUMMARY:TrainSched: Hương\\, Jonas\\; Grammatik');
    expect(ics).toContain('LOCATION:Bahnhofstrasse 1\\, Zürich');
  });

  it('faltet lange Zeilen (≤ 75 Bytes, Diakritika zählen mehrfach)', () => {
    const long = buildIcs([
      { uid: 'x', start: '2026-01-01T00:00:00Z', end: '2026-01-01T01:00:00Z', summary: 'Ư'.repeat(60) },
    ]);
    for (const line of long.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
