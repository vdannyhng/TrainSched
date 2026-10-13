/**
 * „Markdown light“ für Notizen: **fett**, *kursiv*, Listen (- / * / 1.), Links [Text](https://…)
 * und nackte https://-Links. Bewusst klein gehalten – kein HTML, keine Überschriften.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: Inline[] }
  | { type: 'italic'; children: Inline[] }
  | { type: 'link'; text: string; url: string };

export type Block =
  { type: 'paragraph'; children: Inline[] } | { type: 'list'; ordered: boolean; items: Inline[][] };

const SAFE_URL = /^https?:\/\/[^\s<>"]+$/i;

/** Inline-Elemente parsen (rekursiv für fett/kursiv). */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let buffer = '';
  const flush = () => {
    if (buffer) out.push({ type: 'text', text: buffer });
    buffer = '';
  };

  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);

    // [Text](https://…)
    const link = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(rest);
    if (link && SAFE_URL.test(link[2]!)) {
      flush();
      out.push({ type: 'link', text: link[1]!, url: link[2]! });
      i += link[0].length;
      continue;
    }

    // nackte URL
    const bare = /^https?:\/\/[^\s<>"]+[^\s<>".,;:!?)]/i.exec(rest);
    if (bare && (i === 0 || /\s|\(/.test(text[i - 1]!))) {
      flush();
      out.push({ type: 'link', text: bare[0], url: bare[0] });
      i += bare[0].length;
      continue;
    }

    // **fett**
    const bold = /^\*\*(?=\S)([\s\S]*?\S)\*\*/.exec(rest);
    if (bold) {
      flush();
      out.push({ type: 'bold', children: parseInline(bold[1]!) });
      i += bold[0].length;
      continue;
    }

    // *kursiv* oder _kursiv_
    const italic = /^([*_])(?=\S)([^*_\n]*?\S)\1/.exec(rest);
    if (italic && !rest.startsWith('**')) {
      flush();
      out.push({ type: 'italic', children: parseInline(italic[2]!) });
      i += italic[0].length;
      continue;
    }

    buffer += text[i];
    i += 1;
  }
  flush();
  return out;
}

const LIST_ITEM = /^\s*(?:([-*•])|(\d+)[.)])\s+(.*)$/;

/** Text in Absätze und Listen zerlegen. Leere Zeilen trennen Absätze. */
export function parseMarkdownLight(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: Inline[][] } | null = null;

  const closeParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n')) });
    paragraph = [];
  };
  const closeList = () => {
    if (list) blocks.push({ type: 'list', ...list });
    list = null;
  };

  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    const item = LIST_ITEM.exec(line);
    if (item) {
      closeParagraph();
      const ordered = !!item[2];
      if (!list || list.ordered !== ordered) {
        closeList();
        list = { ordered, items: [] };
      }
      list.items.push(parseInline(item[3]!));
    } else if (line.trim() === '') {
      closeParagraph();
      closeList();
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  closeParagraph();
  closeList();
  return blocks;
}

/** Klartext ohne Markdown-Zeichen (für Vorschauen, Screenreader, Push-Texte). */
export function toPlainText(source: string): string {
  const inline = (nodes: Inline[]): string =>
    nodes.map((n) => (n.type === 'text' ? n.text : n.type === 'link' ? n.text : inline(n.children))).join('');
  return parseMarkdownLight(source)
    .map((b) =>
      b.type === 'paragraph' ? inline(b.children) : b.items.map((it) => `• ${inline(it)}`).join('\n'),
    )
    .join('\n');
}
