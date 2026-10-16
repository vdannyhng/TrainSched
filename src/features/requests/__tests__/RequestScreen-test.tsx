import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import LessonRequestScreen from '@/app/(student)/my-lesson/[id]/request';

const mockMutate = jest.fn();
const mockBack = jest.fn();
let mockDeadline: string | null = null;

const mockStart = DateTime.now()
  .setZone('Europe/Zurich')
  .plus({ days: 3 })
  .set({ hour: 18, minute: 0, second: 0, millisecond: 0 });

jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => ({ id: 'L1' }),
}));
jest.mock('@/features/lessons/hooks', () => ({
  useViewerZone: () => 'Europe/Zurich',
  useLocale: () => 'de',
}));
jest.mock('@/features/lessons/api', () => ({
  useLesson: () => ({
    isPending: false,
    isError: false,
    data: {
      id: 'L1',
      start_at: mockStart.toUTC().toISO(),
      end_at: mockStart.plus({ hours: 1 }).toUTC().toISO(),
      status: 'scheduled',
      participants: [],
      title: null,
    },
  }),
}));
jest.mock('@/features/requests/api', () => ({
  useCancelDeadline: () => ({ data: mockDeadline }),
  useCreateRequest: () => ({ mutate: mockMutate, isPending: false, error: null }),
}));

beforeEach(() => {
  mockMutate.mockReset();
  mockDeadline = null;
});

describe('Anfrage-Formular (Schüler)', () => {
  it('schlägt standardmässig dieselbe Uhrzeit am Folgetag vor', async () => {
    await render(<LessonRequestScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Anfrage senden' }));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const input = mockMutate.mock.calls[0][0];
    expect(input.kind).toBe('reschedule');
    expect(input.starts).toHaveLength(1);
    const proposed = DateTime.fromISO(input.starts[0]).setZone('Europe/Zurich');
    expect(proposed.toFormat('HH:mm')).toBe('18:00');
    expect(Math.round(proposed.diff(mockStart, 'days').days)).toBe(1);
  });

  it('bis zu 3 Vorschläge, ungültige Uhrzeit blockiert das Senden', async () => {
    await render(<LessonRequestScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Weiteren Vorschlag hinzufügen' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Weiteren Vorschlag hinzufügen' }));
    expect(screen.getByText('Vorschlag 3')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Weiteren Vorschlag hinzufügen' })).toBeNull();

    await fireEvent.changeText(screen.getAllByLabelText('Uhrzeit')[1]!, '7 Uhr');
    await fireEvent.press(screen.getByRole('button', { name: 'Anfrage senden' }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getAllByText('Bitte Uhrzeit als HH:MM eingeben, z. B. 18:00.').length).toBeGreaterThan(0);
  });

  it('Absage ohne Vorschläge, mit Nachricht', async () => {
    await render(<LessonRequestScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Absage' }));
    expect(screen.queryByText('Ersatztermine')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Nachricht (optional)'), 'Bin krank');
    await fireEvent.press(screen.getByRole('button', { name: 'Anfrage senden' }));
    expect(mockMutate.mock.calls[0][0]).toEqual({ kind: 'cancel', message: 'Bin krank', starts: [] });
  });

  it('warnt, wenn die Absagefrist vorbei ist', async () => {
    mockDeadline = DateTime.now().minus({ hours: 1 }).toUTC().toISO();
    await render(<LessonRequestScreen />);
    expect(screen.getByText(/Die Absagefrist ist vorbei/)).toBeTruthy();
  });
});
