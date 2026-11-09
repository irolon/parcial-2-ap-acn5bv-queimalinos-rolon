/**
 * Helpers comunes de los repositories sobre supabase-js.
 */
import { Errors } from './errors.js';

/** Devuelve `data` de una respuesta de supabase o lanza el error interno. */
export const unwrap = ({ data, error }) => {
  if (error) throw Errors.internal(error.message);
  return data;
};

// PostgREST corta en 1000 filas por respuesta: se pagina hasta una página corta.
const PAGE = 1000;

/**
 * Trae todas las filas de una consulta paginando; `buildQuery` arma la consulta de cero en cada página.
 * `pageSize` permite páginas más chicas cuando cada fila trae embeds pesados (export CSV, GX1).
 */
export async function fetchAll(buildQuery, pageSize = PAGE) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const rows = unwrap(await buildQuery().range(from, from + pageSize - 1));
    out.push(...rows);
    if (rows.length < pageSize) return out;
  }
}
