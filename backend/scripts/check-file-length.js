import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { CODE_EXTENSIONS, MAX_LINES, findOversized } from './lib/file-length.js';

// Uso (desde backend/): node scripts/check-file-length.js — lo corre `npm run lint`. Recorre todo backend/ salvo node_modules, coverage y .git.
const ROOTS = ['.'];
const SKIP_DIRS = new Set(['node_modules', 'coverage', '.git']);

/** Recorre una carpeta y devuelve los archivos de código. */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : walk(path);
    return CODE_EXTENSIONS.includes(extname(entry.name)) ? [path] : [];
  });
}

const files = ROOTS.flatMap(walk).map((path) => ({
  path: relative('.', path).replaceAll('\\', '/'),
  text: readFileSync(path, 'utf8'),
}));
const oversized = findOversized(files);

if (oversized.length === 0) {
  console.log(`OK: ningún archivo pasa de ${MAX_LINES} líneas (${files.length} revisados)`);
} else {
  console.error(`Archivos de más de ${MAX_LINES} líneas (ver CONTRIBUTING.md):`);
  for (const f of oversized) console.error(`  ${f.lines} ${f.path}`);
  process.exit(1);
}
