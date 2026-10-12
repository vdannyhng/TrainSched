import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button, FormTextField } from '@/components/ui';

import { resetPasswordSchema, type ResetPasswordValues } from '../schemas';

type Props = {
  onSubmit: (values: ResetPasswordValues) => void;
  submitting: boolean;
};

export function NewPasswordForm({ onSubmit, submitting }: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  return (
    <>
      <FormTextField
        control={control}
        name="password"
        label={t('auth.password')}
        hint={t('auth.passwordHint')}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <FormTextField
        control={control}
        name="passwordConfirm"
        label={t('auth.passwordConfirm')}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Button title={t('auth.reset.submit')} loading={submitting} onPress={handleSubmit(onSubmit)} />
    </>
  );
}
