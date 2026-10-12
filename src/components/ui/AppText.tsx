import { Text, type TextProps } from 'react-native';

import { typography, type ThemeColors, type TypographyVariant } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Tone = 'default' | 'muted' | 'primary' | 'danger' | 'success' | 'onPrimary';

const toneToColor: Record<Tone, keyof ThemeColors> = {
  default: 'text',
  muted: 'textMuted',
  primary: 'primary',
  danger: 'danger',
  success: 'success',
  onPrimary: 'onPrimary',
};

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
};

/** Text mit App-Schrift (Be Vietnam Pro, volle vietnamesische Diakritika). Font-Scaling bleibt aktiv. */
export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const isHeading = variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      style={[typography[variant], { color: colors[toneToColor[tone]] }, style]}
      {...rest}
    />
  );
}
