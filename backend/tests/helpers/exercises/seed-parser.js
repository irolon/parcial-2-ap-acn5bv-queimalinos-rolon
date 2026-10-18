import { readFileSync } from 'node:fs';

const ROW =
  /^\s*\('((?:[^']|'')*)',\s*'(\w+)',\s*'(\w+)',\s*'((?:[^']|'')*)',\s*'([^']*)',\s*(true|false)\)[,;]?\s*$/;

const unescapeSql = (text) => text.replace(/''/g, "'");

/** Lee el .sql del seed y devuelve una fila por ejercicio (una fila por línea). */
export function parseExerciseSeed(path) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => ROW.exec(line))
    .filter(Boolean)
    .map(([, name, muscleGroup, equipment, description, videoUrl, isGlobal]) => ({
      name: unescapeSql(name),
      muscleGroup,
      equipment,
      description: unescapeSql(description),
      videoUrl,
      isGlobal: isGlobal === 'true',
    }));
}
