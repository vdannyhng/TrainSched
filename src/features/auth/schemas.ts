import { z } from 'zod';

import { acceptInviteSchema, passwordSchema } from '../../../supabase/functions/_shared/inviteSchema';

export {
  acceptInviteSchema,
  formatInviteCode,
  normalizeInviteCode,
} from '../../../supabase/functions/_shared/inviteSchema';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'invalid_email' }));

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'required' }),
});
export type SignInValues = z.input<typeof signInSchema>;

export const inviteFormSchema = acceptInviteSchema
  .extend({ passwordConfirm: z.string() })
  .refine((v) => v.password === v.passwordConfirm, {
    message: 'passwords_mismatch',
    path: ['passwordConfirm'],
  });
export type InviteFormValues = z.input<typeof inviteFormSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordValues = z.input<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password: passwordSchema, passwordConfirm: z.string() })
  .refine((v) => v.password === v.passwordConfirm, {
    message: 'passwords_mismatch',
    path: ['passwordConfirm'],
  });
export type ResetPasswordValues = z.input<typeof resetPasswordSchema>;
