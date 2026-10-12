import {
  emptyStudentForm,
  studentFormSchema,
  toStudentForm,
  toStudentRow,
  type StudentFormValues,
} from '../schemas';

const parse = (overrides: Partial<StudentFormValues>) =>
  studentFormSchema.safeParse({ ...emptyStudentForm, firstName: 'Hương', ...overrides });

const messages = (overrides: Partial<StudentFormValues>) => {
  const result = parse(overrides);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}:${i.message}`);
};

describe('studentFormSchema', () => {
  it('akzeptiert ein minimales Formular', () => {
    expect(parse({}).success).toBe(true);
  });

  it('verlangt einen Vornamen', () => {
    expect(messages({ firstName: '   ' })).toEqual(['firstName:required']);
  });

  it('prüft optionale E-Mail und Telefon nur, wenn ausgefüllt', () => {
    expect(messages({ email: 'kaputt', phone: 'abc' })).toEqual([
      'email:invalid_email',
      'phone:invalid_phone',
    ]);
    expect(messages({ email: ' Huong@Example.COM ', phone: '+41 79 123 45 67' })).toEqual([]);
  });

  it('lehnt unbekannte Zeitzonen ab', () => {
    expect(messages({ timezone: 'Europe/Atlantis' })).toEqual(['timezone:invalid_timezone']);
  });

  it('verlangt bei Minderjährigen Name und Kontakt der Erziehungsberechtigten', () => {
    expect(messages({ isMinor: true })).toEqual([
      'guardianName:required',
      'guardianEmail:guardian_contact_required',
    ]);
    expect(messages({ isMinor: true, guardianName: 'Mẹ', guardianPhone: '+84 90 123 4567' })).toEqual([]);
  });
});

describe('toStudentRow', () => {
  const now = new Date('2026-10-13T08:00:00Z');
  const output = (overrides: Partial<StudentFormValues>) =>
    studentFormSchema.parse({ ...emptyStudentForm, firstName: 'Minh', ...overrides });

  it('wandelt leere Felder in null um', () => {
    const row = toStudentRow(output({ email: '', goal: '' }), null, now);
    expect(row).toMatchObject({ first_name: 'Minh', email: null, goal: null, last_name: null });
  });

  it('löscht Daten der Erziehungsberechtigten bei Volljährigen (Datensparsamkeit)', () => {
    const row = toStudentRow(
      output({
        isMinor: false,
        guardianName: 'Alt',
        guardianEmail: 'alt@example.com',
        guardianConsent: true,
      }),
      '2026-01-01T00:00:00Z',
      now,
    );
    expect(row).toMatchObject({
      guardian_name: null,
      guardian_email: null,
      guardian_phone: null,
      guardian_consent_at: null,
    });
  });

  it('setzt den Einwilligungszeitpunkt beim ersten Haken und behält ihn danach', () => {
    const minor = {
      isMinor: true,
      guardianName: 'Mẹ',
      guardianEmail: 'me@example.com',
      guardianConsent: true,
    };
    expect(toStudentRow(output(minor), null, now).guardian_consent_at).toBe('2026-10-13T08:00:00.000Z');
    expect(toStudentRow(output(minor), '2026-01-01T00:00:00Z', now).guardian_consent_at).toBe(
      '2026-01-01T00:00:00Z',
    );
    expect(
      toStudentRow(output({ ...minor, guardianConsent: false }), '2026-01-01T00:00:00Z', now)
        .guardian_consent_at,
    ).toBeNull();
  });

  it('Formular ↔ Zeile ist verlustfrei', () => {
    const values = output({
      lastName: 'Phạm',
      email: 'minh@example.com',
      currentLevel: 'B1',
      startLevel: 'A2',
      goal: 'Business',
      status: 'inactive',
      tagIds: ['t1'],
    });
    const row = toStudentRow(values, null, now);
    const back = toStudentForm(
      {
        ...row,
        id: 's1',
        teacher_id: 'x',
        profile_id: null,
        hourly_rate: null,
        currency: 'EUR',
        created_at: '',
        updated_at: '',
        search_text: null,
      } as Parameters<typeof toStudentForm>[0],
      ['t1'],
    );
    expect(back).toEqual({ ...emptyStudentForm, ...values });
  });
});
