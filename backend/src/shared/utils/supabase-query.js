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

/** Trae todas las filas de una consulta paginando; `buildQuery` arma la consulta de cero en cada página. */
export async function fetchAll(buildQuery) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const rows = unwrap(await buildQuery().range(from, from + PAGE - 1));
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}
