import { fireEvent, render, screen } from '@testing-library/react-native';

import GuideScreen from '@/app/anleitung';
import de from '@/i18n/locales/de.json';
import vi from '@/i18n/locales/vi.json';

import { GUIDE } from '../guide';

let mockRole: 'teacher' | 'student' = 'teacher';
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}) }));
jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ profile: { role: mockRole } }) }));

/** **Name:** am Zeilenanfang einer Liste → Name (so sind die Reiter in der Anleitung aufgeführt). */
function listedTabs(body: string): string[] {
  return [...body.matchAll(/^- \*\*([^*]+):\*\*/gm)].map((m) => m[1]!);
}

describe('Anleitung – Inhalt', () => {
  it('Deutsch und Vietnamesisch haben dieselbe Gliederung', () => {
    for (const role of ['teacher', 'student'] as const) {
      expect(GUIDE.vi.parts[role].sections).toHaveLength(GUIDE.de.parts[role].sections.length);
      for (const s of [...GUIDE.de.parts[role].sections, ...GUIDE.vi.parts[role].sections]) {
        expect(s.title.trim()).not.toBe('');
        expect(s.body.trim()).not.toBe('');
      }
    }
  });

  it('nennt die Reiter genau so, wie sie in der App heissen', () => {
    const teacherTabs = (t: typeof de) => [
      t.tabs.today,
      t.tabs.calendar,
      t.tabs.students,
      t.tabs.requests,
      t.tabs.settings,
    ];
    const studentTabs = (t: typeof de) => [t.tabs.lessons, t.tabs.homework, t.tabs.materials, t.tabs.profile];
    expect(listedTabs(GUIDE.de.parts.teacher.sections[2]!.body)).toEqual(teacherTabs(de));
    expect(listedTabs(GUIDE.vi.parts.teacher.sections[2]!.body)).toEqual(teacherTabs(vi));
    expect(listedTabs(GUIDE.de.parts.student.sections[1]!.body)).toEqual(studentTabs(de));
    expect(listedTabs(GUIDE.vi.parts.student.sections[1]!.body)).toEqual(studentTabs(vi));
  });
});

describe('Anleitung – Seite', () => {
  it('zeigt Lehrkräften ihren Teil, Sprache und Rolle sind umschaltbar', async () => {
    mockRole = 'teacher';
    await render(<GuideScreen />);
    expect(screen.getByText('Konto anlegen und anmelden')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Tiếng Việt' }));
    expect(screen.getByText('Tạo tài khoản và đăng nhập')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Học viên' }));
    expect(screen.getByText('Nhận lời mời')).toBeTruthy();
  });

  it('öffnet für Schüler direkt den Schüler-Teil, Abschnitte klappen auf', async () => {
    mockRole = 'student';
    await render(<GuideScreen />);
    expect(screen.getByText('Einladung annehmen')).toBeTruthy();
    expect(screen.queryByText(/Im Reiter/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /Hausaufgaben abhaken/ }));
    expect(screen.getByText(/Deine Lehrerin sieht das sofort/)).toBeTruthy();
  });
});
