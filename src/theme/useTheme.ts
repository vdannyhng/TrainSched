import { useColorScheme } from 'react-native';

import { palette, type ColorScheme, type ThemeColors } from './tokens';

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: palette[scheme] };
}
