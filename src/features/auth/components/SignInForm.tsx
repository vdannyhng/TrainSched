import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button, FormTextField } from '@/components/ui';

import { signInSchema, type SignInValues } from '../schemas';

type Props = {
  onSubmit: (values: SignInValues) => void;
  submitting: boolean;
};

export function SignInForm({ onSubmit, submitting }: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <>
      <FormTextField
        control={control}
        name="email"
        label={t('auth.email')}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <FormTextField
        control={control}
        name="password"
        label={t('auth.password')}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit(onSubmit)}
      />
      <Button title={t('auth.signIn.submit')} loading={submitting} onPress={handleSubmit(onSubmit)} />
    </>
  );
}
