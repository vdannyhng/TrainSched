import {
  blockerFormSchema,
  emptyBlockerForm,
  toBlockerForm,
  toBlockerRow,
  type BlockerFormValues,
} from '../api';

const issues = (v: Partial<BlockerFormValues>) => {
  const r = blockerFormSchema.safeParse({ ...emptyBlockerForm('2026-10-19'), title: 'Arbeit', ...v });
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}:${i.message}`);
};

describe('blockerFormSchema', () => {
  it('Standard: eine Stunde ab Startzeit', () => {
    expect(emptyBlockerForm('2026-10-19', '14:30')).toMatchObject({
      startTime: '14:30',
      endTime: '15:30',
      weekdays: [1],
    });
    expect(emptyBlockerForm('2026-10-19', '23:30').endTime).toBe('23:59');
  });

  it.each([
    [{ title: ' ' }, 'title:required'],
    [{ startTime: '16:00', endTime: '08:00' }, 'endTime:end_before_start_time'],
    [{ repeat: 'weekly' as const, weekdays: [] }, 'weekdays:weekdays_required'],
    [{ repeat: 'weekly' as const, endDate: '2026-10-01' }, 'endDate:end_before_start'],
  ])('%j → %s', (v, expected) => {
    expect(issues(v)).toEqual([expected]);
  });
});

describe('toBlockerRow', () => {
  it('Einmalig: Start = Ende, Wochentag des Datums', () => {
    const v = blockerFormSchema.parse({
      ...emptyBlockerForm('2026-10-21'),
      title: 'Zahnarzt',
      weekdays: [1, 2],
    });
    expect(toBlockerRow(v, 'Europe/Zurich')).toMatchObject({
      start_date: '2026-10-21',
      end_date: '2026-10-21',
      weekdays: [3],
    });
  });

  it('Wöchentlich Mo–Fr ohne Ende, Form ↔ Zeile verlustfrei', () => {
    const v = blockerFormSchema.parse({
      ...emptyBlockerForm('2026-10-19'),
      title: 'Arbeit',
      repeat: 'weekly',
      weekdays: [5, 1, 3, 2, 4],
      startTime: '08:00',
      endTime: '16:00',
    });
    const row = toBlockerRow(v, 'Europe/Zurich');
    expect(row).toMatchObject({ end_date: null, weekdays: [1, 2, 3, 4, 5] });
    const back = toBlockerForm({
      ...row,
      id: 'b',
      teacher_id: 't',
      end_date: null,
      weekdays: [1, 2, 3, 4, 5],
      local_start: '08:00:00',
      local_end: '16:00:00',
      created_at: '',
      updated_at: '',
    } as Parameters<typeof toBlockerForm>[0]);
    expect(back).toMatchObject({ repeat: 'weekly', startTime: '08:00', endTime: '16:00', endDate: '' });
  });
});
