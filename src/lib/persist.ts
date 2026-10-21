import type { Query } from '@tanstack/react-query';

/** Diese Daten bleiben offline lesbar. Anhänge nicht (signierte Links laufen ab). */
const PERSISTED_ROOTS = new Set([
  'profile',
  'lessons',
  'notes',
  'homework',
  'requests',
  'students',
  'progress',
  'tags',
  'blockers',
  'teacher-settings',
]);

export function shouldPersistQuery(query: Pick<Query, 'queryKey' | 'state'>): boolean {
  const root = query.queryKey[0];
  return query.state.status === 'success' && typeof root === 'string' && PERSISTED_ROOTS.has(root);
}
