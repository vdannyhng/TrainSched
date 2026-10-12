import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button, FormTextField } from '@/components/ui';

import { formatInviteCode, inviteFormSchema, type InviteFormValues } from '../schemas';

type Props = {
  initialCode?: string;
  onSubmit: (values: InviteFormValues) => void;
  submitting: boolean;
};

export function InviteForm({ initialCode, onSubmit, submitting }: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      code: initialCode ? formatInviteCode(initialCode) : '',
      email: '',
      password: '',
      passwordConfirm: '',
    },
  });

  return (
    <>
      <FormTextField
        control={control}
        name="code"
        label={t('auth.invite.code')}
        placeholder={t('auth.invite.codePlaceholder')}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
      />
      <FormTextField
        control={control}
        name="email"
        label={t('auth.email')}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
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
      <Button title={t('auth.invite.submit')} loading={submitting} onPress={handleSubmit(onSubmit)} />
    </>
  );
}
