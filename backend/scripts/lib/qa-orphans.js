import { TABLES_WITHOUT_FK } from './qa-cleanup.js';

/**
 * Filas sin dueño en las tablas sin FK (`notifications`, `push_tokens`, `refresh_tokens`):
 * su `user_id` no está ni en `trainers` ni en `students`. Los ids son uuid y no se reusan,
 * así que una fila así no la puede leer nadie: es lo que la cascada habría borrado si la
 * tabla tuviera FK. No se mira el email (el usuario ya no existe para saber si era de QA), así
 * que no se sabe si la creó la integración: el clean las informa y las borra solo con
 * `--orphans`, y aun así solo lo que, releído justo antes, sigue sin dueño.
 */
const PAGE = 1000;
const CHUNK = 100; // ids por `.in()`, para no pasarse del largo de la URL

async function run(query) {
  const { data, error } = await query;
  if (error) throw new Error(`qa-orphans: ${error.message}`);
  return data ?? [];
}

/** Lee `column` entera, de a páginas. El `id` desempata para que el orden sea estable entre páginas. */
async function readColumn(supabase, table, column) {
  const values = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select(column).order(column);
    if (column !== 'id') query = query.order('id');
    const rows = await run(query.range(from, from + PAGE - 1));
    values.push(...rows.map((r) => r[column]));
    if (rows.length < PAGE) return values;
  }
}

const chunks = (list) =>
  Array.from({ length: Math.ceil(list.length / CHUNK) }, (_, i) => list.slice(i * CHUNK, (i + 1) * CHUNK));

/**
 * Por tabla: cuántas filas no tienen dueño y de qué `user_id`.
 * Lee primero las filas y después los usuarios: uno creado en el medio cuenta como existente.
 */
export async function findOrphanRows(supabase) {
  const userIdsByTable = {};
  for (const table of TABLES_WITHOUT_FK) {
    userIdsByTable[table] = await readColumn(supabase, table, 'user_id');
  }
  const users = new Set([
    ...(await readColumn(supabase, 'trainers', 'id')),
    ...(await readColumn(supabase, 'students', 'id')),
  ]);
  return Object.fromEntries(
    TABLES_WITHOUT_FK.map((table) => {
      const orphans = userIdsByTable[table].filter((id) => !users.has(id));
      return [table, { rows: orphans.length, userIds: [...new Set(orphans)] }];
    })
  );
}

/** Ids de la lista que siguen sin estar en trainers ni en students (releídos ahora). */
async function stillOrphan(supabase, ids) {
  const alive = new Set();
  for (const part of chunks(ids)) {
    for (const table of ['trainers', 'students']) {
      const rows = await run(supabase.from(table).select('id').in('id', part));
      rows.forEach((r) => alive.add(r.id));
    }
  }
  return ids.filter((id) => !alive.has(id));
}

/** Borra las filas sin dueño de `findOrphanRows`. Devuelve los user_id borrados por tabla. */
export async function deleteOrphanRows(supabase, orphans) {
  const deleted = {};
  for (const table of TABLES_WITHOUT_FK) {
    const ids = await stillOrphan(supabase, orphans[table]?.userIds ?? []);
    for (const part of chunks(ids)) {
      await run(supabase.from(table).delete().in('user_id', part));
    }
    deleted[table] = ids.length;
  }
  return deleted;
}
