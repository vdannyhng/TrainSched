import { parseInline, parseMarkdownLight, toPlainText } from '../markdown';

describe('Markdown light', () => {
  it('fett, kursiv und Text', () => {
    expect(parseInline('Das **Verb** steht *immer* an Position 2')).toEqual([
      { type: 'text', text: 'Das ' },
      { type: 'bold', children: [{ type: 'text', text: 'Verb' }] },
      { type: 'text', text: ' steht ' },
      { type: 'italic', children: [{ type: 'text', text: 'immer' }] },
      { type: 'text', text: ' an Position 2' },
    ]);
  });

  it('verschachtelt: kursiv in fett (mit _…_ eindeutig)', () => {
    expect(parseInline('**sehr _wichtig_**')).toEqual([
      {
        type: 'bold',
        children: [
          { type: 'text', text: 'sehr ' },
          { type: 'italic', children: [{ type: 'text', text: 'wichtig' }] },
        ],
      },
    ]);
  });

  it('Links: Markdown-Link und nackte URL; nur http(s)', () => {
    expect(parseInline('[Übung](https://dw.com/a) und https://quizlet.com/x.')).toEqual([
      { type: 'link', text: 'Übung', url: 'https://dw.com/a' },
      { type: 'text', text: ' und ' },
      { type: 'link', text: 'https://quizlet.com/x', url: 'https://quizlet.com/x' },
      { type: 'text', text: '.' },
    ]);
    // javascript:-Links werden nicht zu Links
    expect(parseInline('[x](javascript:alert(1))').every((n) => n.type === 'text')).toBe(true);
  });

  it('einzelne Sternchen bleiben Text (z. B. Mathe)', () => {
    expect(toPlainText('2 * 3 = 6')).toBe('2 * 3 = 6');
  });

  it('Absätze und Listen', () => {
    const blocks = parseMarkdownLight(
      'Heute geübt:\n- der/die/das\n- **Akkusativ**\n\n1. Lesen\n2. Schreiben',
    );
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'list', 'list']);
    expect(blocks[1]).toMatchObject({ type: 'list', ordered: false });
    expect(blocks[2]).toMatchObject({ type: 'list', ordered: true });
    expect((blocks[2] as { items: unknown[] }).items).toHaveLength(2);
  });

  it('Vietnamesisch bleibt unverändert', () => {
    expect(toPlainText('**Cảm ơn** cô giáo!')).toBe('Cảm ơn cô giáo!');
  });

  it('Klartext für Vorschau', () => {
    expect(toPlainText('- **eins**\n- [zwei](https://a.de)')).toBe('• eins\n• zwei');
  });
});
