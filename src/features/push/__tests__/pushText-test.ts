import { renderPush, type PushRow } from '../../../../supabase/functions/_shared/pushText';

const base: PushRow = {
  kind: 'reminder',
  locale: 'de',
  timezone: 'Europe/Zurich',
  recipient_role: 'student',
  payload: {},
  lesson_id: 'L1',
  request_id: 'R1',
  lesson_start: '2026-11-05T17:00:00Z',
  lesson_label: 'Lan Nguyễn',
  request_kind: null,
  student_name: null,
};

describe('Push-Texte', () => {
  it('Erinnerung auf Deutsch in der Zone des Empfängers', () => {
    const p = renderPush({ ...base, payload: { offset_min: 60 } });
    expect(p.title).toBe('Termin in 1 Std.');
    expect(p.body).toContain('Lan Nguyễn');
    expect(p.body).toContain('18:00');
    expect(p.url).toBe('/my-lesson/L1');
  });

  it('Erinnerung auf Vietnamesisch mit Uhrzeit in Hanoi', () => {
    const p = renderPush({
      ...base,
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
      payload: { offset_min: 1440 },
    });
    expect(p.title).toBe('Buổi học ngày mai');
    expect(p.body).toContain('00:00');
  });

  it('Verschoben zeigt alt → neu', () => {
    const p = renderPush({ ...base, kind: 'lesson_moved', payload: { old_start: '2026-11-04T17:00:00Z' } });
    expect(p.title).toBe('Termin verschoben');
    expect(p.body).toMatch(/Lan Nguyễn: .*18:00 → .*18:00/);
  });

  it('Neue Anfrage führt die Lehrkraft direkt zur Entscheidung', () => {
    const p = renderPush({
      ...base,
      kind: 'request_new',
      recipient_role: 'teacher',
      request_kind: 'cancel',
      student_name: 'Hương',
      lesson_label: null,
    });
    expect(p.title).toBe('Neue Anfrage von Hương');
    expect(p.body.startsWith('Absage: Unterricht')).toBe(true);
    expect(p.url).toBe('/request/R1');
  });

  it('Entscheidung: angenommen/abgelehnt', () => {
    expect(renderPush({ ...base, kind: 'request_decided', payload: { accepted: true } }).title).toBe(
      'Anfrage angenommen',
    );
    expect(
      renderPush({ ...base, kind: 'request_decided', locale: 'vi', payload: { accepted: false } }).title,
    ).toBe('Yêu cầu bị từ chối');
  });

  it('Lehrkraft landet bei Termin-Ereignissen auf der Terminseite', () => {
    expect(renderPush({ ...base, kind: 'lesson_cancelled', recipient_role: 'admin' }).url).toBe('/lesson/L1');
  });
});

describe('Push-Text: Konto gelöscht', () => {
  it('informiert die Lehrkraft und öffnet den Schüler', () => {
    const p = renderPush({
      ...base,
      kind: 'account_deleted',
      recipient_role: 'teacher',
      lesson_id: null,
      lesson_start: null,
      payload: { student_id: 'S1', student_name: 'Hương' },
    });
    expect(p.title).toBe('Hương hat das App-Konto gelöscht');
    expect(p.url).toBe('/student/S1');
  });
});
