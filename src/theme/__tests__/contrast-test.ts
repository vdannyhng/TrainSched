import { contrastRatio } from '@/lib/colors';

import { palette, type ColorScheme } from '../tokens';

/** WCAG AA: Text ≥ 4.5:1 – für hell UND dunkel, auf allen drei Flächen. */
const SURFACES = ['background', 'surface', 'surfaceMuted'] as const;
const TEXT = ['text', 'textMuted', 'primary', 'danger', 'success'] as const;

describe.each(['light', 'dark'] as ColorScheme[])('Kontraste im %s-Modus', (scheme) => {
  const c = palette[scheme];

  it.each(SURFACES.flatMap((bg) => TEXT.map((fg) => [fg, bg] as const)))('%s auf %s ≥ 4.5', (fg, bg) => {
    expect(contrastRatio(c[fg], c[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('Schrift auf Primär- und Gefahr-Buttons ≥ 4.5', () => {
    expect(contrastRatio(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onDanger, c.danger)).toBeGreaterThanOrEqual(4.5);
  });

  it('Fokusrahmen hebt sich ab (≥ 3:1, WCAG Nicht-Text-Kontrast)', () => {
    expect(contrastRatio(c.focus, c.background)).toBeGreaterThanOrEqual(3);
  });
});
