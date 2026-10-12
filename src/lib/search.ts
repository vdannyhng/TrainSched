/**
 * Bringt eine Sucheingabe in dieselbe Form wie `students.search_text`
 * (klein, ohne Diakritika) und entschärft LIKE-Platzhalter.
 */
export function normalizeSearch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}
