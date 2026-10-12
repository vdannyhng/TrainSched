import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { InviteForm } from '../components/InviteForm';
import { SignInForm } from '../components/SignInForm';

describe('SignInForm', () => {
  it('zeigt Validierungsfehler und sendet nicht ab', async () => {
    const onSubmit = jest.fn();
    await render(<SignInForm onSubmit={onSubmit} submitting={false} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Anmelden' }));

    expect(await screen.findByText('Bitte gib eine gültige E-Mail ein.')).toBeTruthy();
    expect(screen.getByText('Pflichtfeld')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sendet normalisierte Werte ab', async () => {
    const onSubmit = jest.fn();
    await render(<SignInForm onSubmit={onSubmit} submitting={false} />);

    await fireEvent.changeText(screen.getByLabelText('E-Mail'), '  Lan@Example.ch ');
    await fireEvent.changeText(screen.getByLabelText('Passwort'), 'geheim123');
    await fireEvent.press(screen.getByRole('button', { name: 'Anmelden' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({ email: 'lan@example.ch', password: 'geheim123' });
  });
});

describe('InviteForm', () => {
  it('übernimmt den Code aus dem Deep Link formatiert', async () => {
    await render(<InviteForm initialCode="abcdefgh" onSubmit={jest.fn()} submitting={false} />);
    expect(screen.getByLabelText('Einladungscode').props.value).toBe('ABCD-EFGH');
  });
});
