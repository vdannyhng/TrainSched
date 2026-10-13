import { render } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import type { Lesson } from '../api';
import { Timeline } from '../components/Timeline';

const day = '2026-10-15';

// Tagesansicht: 56 px pro Stunde ab 06:00 → y = 13 × 56 = 728 entspricht 19:00.
// Der neue Block (60 Min.) wird unter dem Finger zentriert → Start 18:30.
async function renderDay(lessons: Lesson[] = []) {
  const onCreateSlot = jest.fn();
  await render(
    <Timeline
      days={[day]}
      lessons={lessons}
      zone="Europe/Zurich"
      locale="de"
      today={day}
      onPressLesson={jest.fn()}
      onCreateSlot={onCreateSlot}
    />,
  );
  return onCreateSlot;
}

describe('Timeline – Termin per Gedrückthalten und Ziehen anlegen', () => {
  it('Slot folgt dem Finger im 15-Minuten-Raster', async () => {
    const onCreateSlot = await renderDay();
    fireGestureHandler(getByGestureTestId(`timeline-${day}`), [
      { state: State.BEGAN, y: 728 },
      { state: State.ACTIVE, y: 728 },
      { y: 750 },
      { y: 812 }, // +84 px = +1,5 Std.
      { state: State.END, y: 812 },
    ]);
    expect(onCreateSlot).toHaveBeenCalledTimes(1);
    expect(onCreateSlot).toHaveBeenCalledWith({ date: day, time: '20:00', durationMin: 60 });
  });

  it('Zeit wird auf 06:00 bis 23:00 (Start) begrenzt', async () => {
    const onCreateSlot = await renderDay();
    fireGestureHandler(getByGestureTestId(`timeline-${day}`), [
      { state: State.BEGAN, y: 5 },
      { state: State.ACTIVE, y: 5 },
      { state: State.END, y: 5 },
    ]);
    expect(onCreateSlot).toHaveBeenCalledWith({ date: day, time: '06:00', durationMin: 60 });
  });

  it('auf einem bestehenden Termin wird nichts angelegt', async () => {
    const lesson = {
      id: 'l1',
      start_at: '2026-10-15T16:30:00.000Z', // 18:30 Zürich
      end_at: '2026-10-15T17:30:00.000Z',
      status: 'scheduled',
      title: 'Hương',
      level: null,
      format: 'online',
      location: null,
      participants: [],
      tags: [],
    } as unknown as Lesson;
    const onCreateSlot = await renderDay([lesson]);
    fireGestureHandler(getByGestureTestId(`timeline-${day}`), [
      { state: State.BEGAN, y: 728 },
      { state: State.ACTIVE, y: 728 },
      { state: State.END, y: 728 },
    ]);
    expect(onCreateSlot).not.toHaveBeenCalled();
  });
});

describe('Timeline – PC (Web): Klicken und mit der Maus ziehen', () => {
  async function renderWeb() {
    const onCreateSlot = jest.fn();
    await render(
      <Timeline
        days={[day]}
        lessons={[]}
        zone="Europe/Zurich"
        locale="de"
        today={day}
        onPressLesson={jest.fn()}
        onCreateSlot={onCreateSlot}
        pointer="mouse"
      />,
    );
    return onCreateSlot;
  }

  it('Klick legt 60 Min. ab der angeklickten halben Stunde an', async () => {
    const onCreateSlot = await renderWeb();
    // y = 4,4 Std. × 56 px → 10:24 → Slot ab 10:00
    fireGestureHandler(getByGestureTestId(`timeline-click-${day}`), [
      { state: State.BEGAN, y: 246 },
      { state: State.ACTIVE, y: 246 },
      { state: State.END, y: 246 },
    ]);
    expect(onCreateSlot).toHaveBeenCalledWith({ date: day, time: '10:00', durationMin: 60 });
  });

  it('Ziehen mit der Maus wählt einen Zeitraum (10:00–11:30)', async () => {
    const onCreateSlot = await renderWeb();
    // Start 10:05 (y=229), Ende 11:35 (y=313) → 10:00–11:30
    fireGestureHandler(getByGestureTestId(`timeline-mouse-${day}`), [
      { state: State.BEGAN, y: 229, translationY: 0 },
      { state: State.ACTIVE, y: 240, translationY: 11 },
      { y: 313, translationY: 84 },
      { state: State.END, y: 313, translationY: 84 },
    ]);
    expect(onCreateSlot).toHaveBeenCalledWith({ date: day, time: '10:00', durationMin: 90 });
  });
});
