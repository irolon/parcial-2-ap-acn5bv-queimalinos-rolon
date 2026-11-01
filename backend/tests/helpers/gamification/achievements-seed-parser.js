import { readFileSync } from 'node:fs';

// ('CODE', 'Nombre', 'Descripción', 'categoria', '{"type":...}'), una fila por línea.
const ROW = /^\s*\('(\w+)',\s*'(?:[^']|'')*',\s*'(?:[^']|'')*',\s*'(\w+)',\s*'(\{[^']*\})'\)[,;]?\s*$/;

/** Lee el .sql del seed de logros y devuelve `{ code, category, criteria }` por fila. */
export function parseAchievementsSeed(path) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => ROW.exec(line))
    .filter(Boolean)
    .map(([, code, category, criteria]) => ({ code, category, criteria: JSON.parse(criteria) }));
}
