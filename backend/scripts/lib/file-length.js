/**
 * Regla del proyecto (CONTRIBUTING.md): ningún archivo de código pasa de 200
 * líneas FÍSICAS, todo incluido (blancos, comentarios, imports).
 */

export const MAX_LINES = 200;

/** Extensiones de código que controla el backend (ESLint no lee los .sql). */
export const CODE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.sql'];

/** Líneas físicas de un texto: la última cuenta aunque no termine en salto. */
export function countLines(text) {
  if (text === '') return 0;
  const breaks = text.match(/\n/g)?.length ?? 0;
  return text.endsWith('\n') ? breaks : breaks + 1;
}

/** Archivos que pasan el límite, del más largo al más corto. */
export function findOversized(files, max = MAX_LINES) {
  return files
    .map(({ path, text }) => ({ path, lines: countLines(text) }))
    .filter((f) => f.lines > max)
    .sort((a, b) => b.lines - a.lines);
}
