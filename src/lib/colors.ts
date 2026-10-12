import type { Enums } from '@/types/database';

export type Level = Enums<'cefr_level'>;

export const LEVELS: readonly Level[] = ['A1', 'A2', 'B1', 'B2'];

/** Feste Farben pro Niveau (Kontrast mit weisser Schrift ≥ 4.5:1). */
export const LEVEL_COLORS: Record<Level, string> = {
  A1: '#15803D',
  A2: '#0E7490',
  B1: '#1D4ED8',
  B2: '#7C3AED',
};

/** Auswahl für Themen-Farben (gut unterscheidbar, alle mit ausreichend Kontrast). */
export const TAG_COLOR_PRESETS = [
  '#0E7490',
  '#7C3AED',
  '#15803D',
  '#B91C1C',
  '#A16207',
  '#BE185D',
  '#1D4ED8',
  '#4B5563',
  '#FDE68A',
  '#A7F3D0',
] as const;

const HEX = /^#([0-9a-f]{6})$/i;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative Luminanz nach WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const match = HEX.exec(hex);
  if (!match?.[1]) throw new Error(`invalid color: ${hex}`);
  const n = parseInt(match[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Schwarz oder Weiss – je nachdem, was auf der Hintergrundfarbe besser lesbar ist. */
export function contrastText(background: string): '#000000' | '#FFFFFF' {
  return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, '#000000') ? '#FFFFFF' : '#000000';
}
