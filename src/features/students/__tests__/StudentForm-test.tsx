import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { StudentForm } from '../components/StudentForm';
import { emptyStudentForm } from '../schemas';

const tags = [
  { id: 't1', label: 'Grammatik', color: '#7C3AED' },
  { id: 't2', label: 'Aussprache', color: '#0E7490' },
];

async function renderForm(onSubmit = jest.fn()) {
  await render(
    <StudentForm
      defaultValues={emptyStudentForm}
      tags={tags}
      onSubmit={onSubmit}
      submitting={false}
      submitLabel="Anlegen"
    />,
  );
  return onSubmit;
}

describe('StudentForm', () => {
  it('zeigt Felder für Erziehungsberechtigte erst bei „Minderjährig“', async () => {
    await renderForm();
    expect(screen.queryByText('Einwilligung der Erziehungsberechtigten liegt vor')).toBeNull();

    await fireEvent(screen.getByLabelText('Minderjährig'), 'valueChange', true);

    expect(await screen.findByText('Einwilligung der Erziehungsberechtigten liegt vor')).toBeTruthy();
  });

  it('übergibt Level, Themen und Zeitzone aus den Auswahl-Chips', async () => {
    const onSubmit = await renderForm();

    await fireEvent.changeText(screen.getByLabelText('Vorname'), 'Hương');
    await fireEvent.press(screen.getAllByRole('radio', { name: 'B1' })[0]!);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Grammatik' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Asia/Ho_Chi_Minh' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Anlegen' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      firstName: 'Hương',
      currentLevel: 'B1',
      tagIds: ['t1'],
      timezone: 'Asia/Ho_Chi_Minh',
    });
  });

  it('blockiert das Absenden ohne Vorname', async () => {
    const onSubmit = await renderForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Anlegen' }));
    expect(await screen.findByText('Pflichtfeld')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
