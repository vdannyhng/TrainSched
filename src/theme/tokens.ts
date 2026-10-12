// Farben auf WCAG-AA-Kontrast (≥ 4.5:1 für Text) gegen ihre Hintergründe geprüft.
export const palette = {
  light: {
    background: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF1F5',
    border: '#D5DAE1',
    text: '#14181F',
    textMuted: '#4F5866',
    primary: '#1F5F8B',
    primaryPressed: '#174A6D',
    onPrimary: '#FFFFFF',
    danger: '#B42318',
    onDanger: '#FFFFFF',
    success: '#1E7A45',
    focus: '#2E7DBA',
  },
  dark: {
    background: '#0F1216',
    surface: '#181C22',
    surfaceMuted: '#222831',
    border: '#3A424D',
    text: '#F1F3F6',
    textMuted: '#AEB6C2',
    primary: '#7DB8E3',
    primaryPressed: '#9CCAEB',
    onPrimary: '#0B1F2E',
    danger: '#F97066',
    onDanger: '#2A0603',
    success: '#5CC489',
    focus: '#9CCAEB',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type ThemeColors = { [K in keyof (typeof palette)['light']]: string };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

/** Mindestgrösse für Touch-Ziele (Material: 48dp, Apple: 44pt). */
export const MIN_TOUCH = 48;

export const fontFamily = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
} as const;

export const typography = {
  title: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 36 },
  heading: { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 28 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
} as const;

export type TypographyVariant = keyof typeof typography;
