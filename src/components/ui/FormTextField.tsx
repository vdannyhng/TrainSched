import { useTranslation } from 'react-i18next';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { validationMessage } from '@/lib/validation';

import { TextField, type TextFieldProps } from './TextField';

type Props<T extends FieldValues> = Omit<TextFieldProps, 'value' | 'onChangeText' | 'error'> & {
  control: Control<T, any, any>;
  name: Path<T>;
};

/** TextField an React Hook Form gebunden. Zod-Fehlermeldungen sind Keys unter `validation.*`. */
export function FormTextField<T extends FieldValues>({ control, name, ...rest }: Props<T>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <TextField
          value={value ?? ''}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error ? t(validationMessage(error.message)) : undefined}
          {...rest}
        />
      )}
    />
  );
}
