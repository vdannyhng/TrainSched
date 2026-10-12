import de from '@/i18n/locales/de.json';

type ValidationKey = keyof typeof de.validation;

/** Zod-Fehlermeldungen sind Keys (z. B. `invalid_email`); unbekannte fallen auf `required` zurück. */
export function validationMessage(message: string | undefined): `validation.${ValidationKey}` {
  if (message && message in de.validation) return `validation.${message as ValidationKey}`;
  return 'validation.required';
}
